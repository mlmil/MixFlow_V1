export function exportMixingStationJSON(graph) {
  const result = {
    format: 'MixingStationScene',
    generator: 'MixFlow-ComfyUI-Router',
    timestamp: new Date().toISOString(),
    mixerSeries: 'X-Air',
    channels: {},
    buses: {},
    mainLR: {
      fader: 0,
      on: true
    }
  };

  // Find all input nodes and channel strip nodes
  const inputs = Array.from(graph.nodes.values()).filter(n => n.category === 'input');
  const strips = Array.from(graph.nodes.values()).filter(n => n.category === 'strip');
  const buses = Array.from(graph.nodes.values()).filter(n => n.category === 'bus');
  const mainNode = Array.from(graph.nodes.values()).find(n => n.category === 'main');

  for (let ch = 1; ch <= 18; ch++) {
    const chIndex0 = (ch - 1).toString();
    const inputNode = inputs.find(n => n.getProperty('channelIndex') === ch);
    const stripNode = strips.find(n => n.getProperty('channelIndex') === ch);

    const name = stripNode?.getProperty('name') || inputNode?.getProperty('name') || (ch <= 16 ? `Ch ${ch}` : `Aux ${ch}`);
    const gain = inputNode?.getProperty('gain') !== undefined ? inputNode.getProperty('gain') : 0;
    const phantom = inputNode?.getProperty('phantom') || false;
    const invert = inputNode?.getProperty('invert') || false;
    const hpf = inputNode?.getProperty('hpf') || 0;
    const rtnsw = stripNode?.getProperty('rtnsw') ? 1 : 0;
    const fader = stripNode?.getProperty('fader') !== undefined ? stripNode.getProperty('fader') : 0;
    const muted = stripNode?.getProperty('muted') || false;

    result.channels[chIndex0] = {
      channelNumber: ch,
      name,
      preampGain: gain,
      phantom,
      invert,
      hpf,
      rtnsw,
      fader,
      on: !muted,
      lrAssign: true
    };
  }

  buses.forEach(b => {
    const auxIndex = b.getProperty('auxIndex', 1);
    result.buses[auxIndex.toString()] = {
      name: b.getProperty('name'),
      masterFader: b.getProperty('masterFader', 0)
    };
  });

  if (mainNode) {
    result.mainLR.fader = mainNode.getProperty('masterFader', 0);
  }

  return result;
}
