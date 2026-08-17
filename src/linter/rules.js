export const RULES = {
  ERR_DEAD_RETURN: {
    code: 'ERR_DEAD_RETURN',
    severity: 'error',
    title: 'Dead Channel (Unconnected USB Return)',
    check(graph, diagnostics) {
      graph.nodes.forEach(node => {
        if (node.category === 'strip') {
          const isUSB = node.getProperty('rtnsw');
          if (isUSB) {
            const usbPort = node.inputs.find(p => p.name.includes('USB'));
            if (usbPort && !usbPort.isConnected) {
              diagnostics.push({
                code: 'ERR_DEAD_RETURN',
                severity: 'error',
                nodeId: node.id,
                message: `Strip ${node.title} is set to USB Return ('rtnsw=1'), but no DAW track is routed into its USB In port.`,
                fix: {
                  label: 'Switch to Analog In',
                  apply(g) {
                    const n = g.getNode(node.id);
                    if (n) n.setProperty('rtnsw', false);
                  }
                }
              });
            }
          }
        }
      });
    }
  },

  WARN_TAP_POST_FADER: {
    code: 'WARN_TAP_POST_FADER',
    severity: 'warning',
    title: 'Processing Tap Point Sub-Optimal',
    check(graph, diagnostics) {
      graph.nodes.forEach(node => {
        if (node.category === 'usb_send') {
          const tap = node.getProperty('tapPoint');
          if (tap === 'Post-Fader' || tap === 'Post-EQ') {
            const outPort = node.outputs[0];
            const isConnectedToLiveDaw = Array.from(outPort.connections).some(conn => {
              const targetNode = graph.getNode(conn.toNodeId);
              return targetNode && targetNode.category === 'daw' && 
                (targetNode.getProperty('trackType') === 'live_vocal' || targetNode.getProperty('trackType') === 'guitar_amp');
            });

            if (isConnectedToLiveDaw) {
              diagnostics.push({
                code: 'WARN_TAP_POST_FADER',
                severity: 'warning',
                nodeId: node.id,
                message: `${node.title} tap is '${tap}'. Mixer fader moves will alter Ableton plugin input level.`,
                fix: {
                  label: "Set Tap to 'Analog In'",
                  apply(g) {
                    const n = g.getNode(node.id);
                    if (n) n.setProperty('tapPoint', 'Analog In');
                  }
                }
              });
            }
          }
        }
      });
    }
  },

  WARN_PHANTOM_LINE: {
    code: 'WARN_PHANTOM_LINE',
    severity: 'warning',
    title: 'Phantom Power on Line/Stereo Source',
    check(graph, diagnostics) {
      graph.nodes.forEach(node => {
        if (node.category === 'input') {
          const isLine = node.getProperty('isLineLevel');
          const phantom = node.getProperty('phantom');
          if (isLine && phantom) {
            diagnostics.push({
              code: 'WARN_PHANTOM_LINE',
              severity: 'warning',
              nodeId: node.id,
              message: `+48V Phantom Power is active on line-level source (${node.title}).`,
              fix: {
                label: 'Turn Off +48V',
                apply(g) {
                  const n = g.getNode(node.id);
                  if (n) n.setProperty('phantom', false);
                }
              }
            });
          }
        }
      });
    }
  },

  ERR_COMB_FILTER: {
    code: 'ERR_COMB_FILTER',
    severity: 'error',
    title: 'Double-Monitoring / Comb Filter Hazard',
    check(graph, diagnostics) {
      graph.nodes.forEach(node => {
        if (node.category === 'strip') {
          const isUSB = node.getProperty('rtnsw');
          const analogPort = node.inputs.find(p => p.name.includes('Analog'));
          const usbPort = node.inputs.find(p => p.name.includes('USB'));

          if (analogPort && analogPort.isConnected && usbPort && usbPort.isConnected && !isUSB) {
            diagnostics.push({
              code: 'ERR_COMB_FILTER',
              severity: 'error',
              nodeId: node.id,
              message: `Comb-Filtering Hazard: Channel ${node.title} receives both Analog and DAW USB signals with rtnsw set to Analog.`,
              fix: {
                label: 'Switch to USB Return',
                apply(g) {
                  const n = g.getNode(node.id);
                  if (n) n.setProperty('rtnsw', true);
                }
              }
            });
          }
        }
      });
    }
  }
};
