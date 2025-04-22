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
  //gl_FragColor = texture2D(u_normals, v_texCoord);
}
  `

  const light2dProgramInfo = twgl.createProgramInfo(renderer.gl, [vertexShader, fragmentShader]);
  let lightPos = [0, 0, 0.075]
  let lightColor = [1, 0.8, 0.6, 1]
  let ambientColor = [0.6, 0.6, 1, 0.2]
  let falloff = [0.4, 3, 20]
  const testNormal = twgl.createTexture(renderer.gl, {src: "data:image/png;base64,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"})

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
          u_resolution: drawable.skin.size,
          LightPos: lightPos,
          LightColor: lightColor,
          AmbientColor: ambientColor,
          Falloff: falloff,
          u_normals: testNormal
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

      twgl.setUniforms(currentShader, uniforms);
      twgl.drawBufferInfo(gl, this._bufferInfo, gl.TRIANGLES);
    }

    this._regionId = null;
  }

  class Light2D {
    getInfo() {
      return {
        id: 'light2d',
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
            text: 'Set my normal map to [NORMALMAP]',
            arguments: {
              NORMALMAP: {
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
                defaultValue: 1
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
                defaultValue: 0.2
              }
            }
          },
          {
            opcode: 'setFalloff',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Set falloff to [X] [Y] [Z]',
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
      } else if (STATE == "disable") {
        drawable.light2d.shouldDoLighting = false
      }
    }

    setLightPos({X, Y, Z}) {
      lightPos = [X, Y, Z]
    }

    setLightColor({ COLOR, INTENSITY}) {
      const rgb = Scratch.Cast.toRgbColorList(COLOR)
      lightColor = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, INTENSITY / 100]
    }

    setAmbientColor({ COLOR, INTENSITY}) {
      const rgb = Scratch.Cast.toRgbColorList(COLOR)
      ambientColor = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, INTENSITY / 100]
    }

    setFalloff({X, Y, Z}) {
      falloff = [X, Y, Z]
    }
  }

  // @ts-ignore
  Scratch.extensions.register(new Light2D());
})(Scratch);