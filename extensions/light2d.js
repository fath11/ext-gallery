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
          text: 'Set light pos to [X] [Y]',
          arguments: {
            X: {
              type: Scratch.ArgumentType.NUMBER,
              defaultValue: 0
            },
            Y: {
              type: Scratch.ArgumentType.NUMBER,
              defaultValue: 0
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
              defaultValue: 0
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
              defaultValue: 0
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
              defaultValue: 0
            },
            Y: {
              type: Scratch.ArgumentType.NUMBER,
              defaultValue: 0
            },
            Z: {
              type: Scratch.ArgumentType.NUMBER,
              defaultValue: 0
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

  hello() {
    return 'World!';
  }
}

// @ts-ignore
Scratch.extensions.register(new Light2D());