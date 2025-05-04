// Name: Light2D
// ID: fath11light2d
// Description: Easy normal map lighting.
// By: Fath11 <https://scratch.mit.edu/users/Fath11/>

(function(Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Light2D must run unsandboxed');
  }

  const vm = Scratch.vm
  const runtime = vm.runtime
  const renderer = vm.renderer
  const twgl = renderer.exports.twgl

  const vertexShader = `precision mediump float;
#ifdef DRAW_MODE_line
uniform vec2 u_stageSize;attribute vec2 a_lineThicknessAndLength;attribute vec4 a_penPoints;attribute vec4 a_lineColor;varying vec4 v_lineColor;varying float v_lineThickness;varying float v_lineLength;varying vec4 v_penPoints;const float epsilon=1e-3;
#endif
#if !(defined(DRAW_MODE_line) || defined(DRAW_MODE_background))
uniform mat4 u_projectionMatrix;uniform mat4 u_modelMatrix;attribute vec2 a_texCoord;
#endif
attribute vec2 a_position;varying vec2 v_texCoord;void main(){
#ifdef DRAW_MODE_line
			vec2 position=a_position;float expandedRadius=(a_lineThicknessAndLength.x*.5)+1.4142135623730951;v_texCoord.x=mix(.0,a_lineThicknessAndLength.y+(expandedRadius*2.),a_position.x)-expandedRadius;v_texCoord.y=((a_position.y-.5)*expandedRadius)+.5;position.x*=a_lineThicknessAndLength.y+(2.*expandedRadius);position.y*=2.*expandedRadius;position-=expandedRadius;vec2 pointDiff=a_penPoints.zw;pointDiff.x=(abs(pointDiff.x)<epsilon && abs(pointDiff.y)<epsilon)?epsilon:pointDiff.x;vec2 normalized=pointDiff/max(a_lineThicknessAndLength.y,epsilon);position=mat2(normalized.x,normalized.y,-normalized.y,normalized.x)*position;position+=a_penPoints.xy;position*=2./u_stageSize;gl_Position=vec4(position,0,1);v_lineColor=a_lineColor;v_lineThickness=a_lineThicknessAndLength.x;v_lineLength=a_lineThicknessAndLength.y;v_penPoints=a_penPoints;
#elif defined(DRAW_MODE_background)
	gl_Position=vec4(a_position*2.,0,1);
#else
	gl_Position=u_projectionMatrix*u_modelMatrix*vec4(a_position,0,1);v_texCoord=a_texCoord;
#endif
}`

  const fragmentShader = `
precision mediump float;

varying vec2 v_texCoord;
uniform vec2 u_resolution;

uniform sampler2D u_skin;
uniform sampler2D u_normals;

uniform vec3 LightPos;
uniform vec4 LightColor;

uniform vec4 AmbientColor;
uniform vec3 Falloff;

void main() {
  //RGBA of our diffuse color
	vec4 DiffuseColor = texture2D(u_skin, v_texCoord);
	
	//RGB of our normal map
	vec3 NormalMap = texture2D(u_normals, v_texCoord).rgb;
	
	//The delta position of light
	vec3 LightDir = vec3(LightPos.xy - (gl_FragCoord.xy / u_resolution.xy), LightPos.z);
	
	//Correct for aspect ratio
	LightDir.x *= u_resolution.x / u_resolution.y;
	
	//Determine distance (used for attenuation) BEFORE we normalize our LightDir
	float D = length(LightDir);
	
	//normalize our vectors
	vec3 N = normalize(NormalMap * 2.0 - 1.0);
  //vec3 N = vec3(0.,0.,1.);
	vec3 L = normalize(LightDir);
	
	//Pre-multiply light color with intensity
	//Then perform "N dot L" to determine our diffuse term
	vec3 Diffuse = (LightColor.rgb * LightColor.a) * max(dot(N, L), 0.0);

	//pre-multiply ambient color with intensity
	vec3 Ambient = AmbientColor.rgb * AmbientColor.a;
	
	//calculate attenuation
	float Attenuation = 1.0 / ( Falloff.x + (Falloff.y*D) + (Falloff.z*D*D) );
	
	//the calculation which brings it all together
	vec3 Intensity = Ambient + Diffuse * Attenuation;
	vec3 FinalColor = DiffuseColor.rgb * Intensity;
	gl_FragColor = vec4(FinalColor, DiffuseColor.a);
  //gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);
}
  `

  const light2dProgramInfo = twgl.createProgramInfo(renderer.gl, [vertexShader, fragmentShader]);
  let lightPos = [0.5, 0.5, 0.075]
  let lightColor = [1, 0.8, 0.6, 1]
  let ambientColor = [0.6, 0.6, 1, 0.2]
  let falloff = [0.4, 3, 20]

  renderer.constructor.prototype._drawThese = function(drawables, drawMode, projection, opts = {}) {
    const gl = this._gl;
    let currentShader = null;

    const framebufferSpaceScaleDiffers = (
        'framebufferWidth' in opts && 'framebufferHeight' in opts &&
        opts.framebufferWidth !== this._nativeSize[0] && opts.framebufferHeight !== this._nativeSize[1]
    );

    const numDrawables = drawables.length;
    for (let drawableIndex = 0; drawableIndex < numDrawables; ++drawableIndex) {
      const drawableID = drawables[drawableIndex];
      if (opts.filter && !opts.filter(drawableID)) continue;

      const drawable = this._allDrawables[drawableID];
      if (!drawable.getVisible() && !opts.ignoreVisibility) continue;

      const drawableScale = framebufferSpaceScaleDiffers ? [
        drawable.scale[0] * opts.framebufferWidth / this._nativeSize[0],
        drawable.scale[1] * opts.framebufferHeight / this._nativeSize[1]
      ] : drawable.scale;

      if (!drawable.skin || !drawable.skin.getTexture(drawableScale)) continue;
      if (opts.skipPrivateSkins && drawable.skin.private) continue;

      const uniforms = {};

      let effectBits = drawable.enabledEffects;
      effectBits &= Object.prototype.hasOwnProperty.call(opts, 'effectMask') ? opts.effectMask : effectBits;
      const newShader = drawable.light2d?.shouldDoLighting ? light2dProgramInfo : this._shaderManager.getShader(drawMode, effectBits);

      if (this._regionId !== newShader) {
        this._doExitDrawRegion();
        this._regionId = newShader;

        currentShader = newShader;
        gl.useProgram(currentShader.program);
        twgl.setBuffersAndAttributes(gl, currentShader, this._bufferInfo);
        Object.assign(uniforms, {
          u_projectionMatrix: projection,
          u_resolution: [gl.canvas.width, gl.canvas.height],
          LightPos: lightPos,
          LightColor: lightColor,
          AmbientColor: ambientColor,
          Falloff: falloff,
        });
      }

      Object.assign(uniforms,
        drawable.skin.getUniforms(drawableScale),
        drawable.getUniforms());

      if (opts.extraUniforms) {
        Object.assign(uniforms, opts.extraUniforms);
      }

      if (uniforms.u_skin) {
        twgl.setTextureParameters(
            gl, uniforms.u_skin, {
                minMag: drawable.skin.useNearest(drawableScale, drawable) ? gl.NEAREST : gl.LINEAR
            }
        );
      }

      if (drawable.light2d?.normalmap) {
        twgl.setTextureParameters(
          gl, drawable.light2d.normalmap, {
              minMag: gl.LINEAR,
          }
        );
        Object.assign(uniforms, {
          u_normals: drawable.light2d.normalmap
        });
      }

      twgl.setUniforms(currentShader, uniforms);
      twgl.drawBufferInfo(gl, this._bufferInfo, gl.TRIANGLES);
    }

    this._regionId = null;
  }

  class Light2D {
    getInfo() {
      return {
        id: 'fath11light2d',
        name: 'Light 2D',
        blocks: [
          {
            opcode: 'shouldDoLighting',
            blockType: Scratch.BlockType.COMMAND,
            text: '[STATE] lighting on myself',
            arguments: {
              STATE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'STATE'
              },
            }
          },
          {
            opcode: 'setMyNormalmap',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set my normal map to [COSTUME]',
            arguments: {
              COSTUME: {
                type: Scratch.ArgumentType.COSTUME,
              },
            }
          },
          "---",
          {
            opcode: 'setLightPos',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set light pos to [X] [Y] [Z]',
            arguments: {
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Z: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.075
              }
            }
          },
          {
            opcode: 'setLightColor',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set light color to [COLOR] with intensity [INTENSITY]',
            arguments: {
              COLOR: {
                type: Scratch.ArgumentType.COLOR
              },
              INTENSITY: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              }
            }
          },
          "---",
          {
            opcode: 'setAmbientColor',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set ambient color to [COLOR] with intensity [INTENSITY]',
            arguments: {
              COLOR: {
                type: Scratch.ArgumentType.COLOR
              },
              INTENSITY: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 20
              }
            }
          },
          {
            opcode: 'setFalloff',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set constant falloff: [X] linear falloff: [Y] quadratic falloff: [Z]',
            arguments: {
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0.4
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 3
              },
              Z: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 20
              }
            }
          },
        ],
        menus: {
          STATE: {
            acceptReporters: true,
            items: ['enable', 'disable']
          }
        }
      };
    }

    shouldDoLighting({ STATE }, util) {
      const drawable = renderer._allDrawables[util.target.drawableID]
      if (!drawable) return;
      if (!drawable.light2d) drawable.light2d = {}

      if (STATE == "enable") {
        drawable.light2d.shouldDoLighting = true
        renderer.dirty = true
      } else if (STATE == "disable") {
        drawable.light2d.shouldDoLighting = false
        renderer.dirty = true
      }
    }

    setMyNormalmap({COSTUME}, util) {
      const drawable = renderer._allDrawables[util.target.drawableID]
      if (!drawable) return;
      if (!drawable?.light2d?.shouldDoLighting) return;

      const costumeIndex = util.target.getCostumeIndexByName(Scratch.Cast.toString(COSTUME));
      if (costumeIndex === -1) return;
      const costume = util.target.sprite.costumes[costumeIndex];
      const skin = renderer._allSkins[costume.skinId]

      drawable.light2d.normalmap = skin._texture ? skin._texture : skin._uniforms.u_skin
      renderer.dirty = true
    }

    setLightPos({X, Y, Z}) {
      const canvasWidth = renderer.canvas.width
      const canvasHeight = renderer.canvas.height

      const normalizedX = (Scratch.Cast.toNumber(X) + (canvasWidth / 2)) / canvasWidth
      const normalizedY = (Scratch.Cast.toNumber(Y) + (canvasHeight / 2)) / canvasHeight

      lightPos = [normalizedX, normalizedY, Z]
      renderer.dirty = true
    }

    setLightColor({ COLOR, INTENSITY}) {
      const rgb = Scratch.Cast.toRgbColorList(COLOR)
      lightColor = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, Scratch.Cast.toNumber(INTENSITY) / 100]
      renderer.dirty = true
    }

    setAmbientColor({ COLOR, INTENSITY}) {
      const rgb = Scratch.Cast.toRgbColorList(COLOR)
      ambientColor = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, Scratch.Cast.toNumber(INTENSITY) / 100]
      renderer.dirty = true
    }

    setFalloff({X, Y, Z}) {
      falloff = [Scratch.Cast.toNumber(X), Scratch.Cast.toNumber(Y), Scratch.Cast.toNumber(Z)]
      renderer.dirty = true
    }
  }

  // @ts-ignore
  Scratch.extensions.register(new Light2D());
})(Scratch);