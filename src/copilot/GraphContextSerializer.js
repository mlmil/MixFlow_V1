export class GraphContextSerializer {
  static summarize(graph, diagnostics = []) {
    const summary = {
      timestamp: new Date().toISOString(),
      mixerModel: 'Behringer X Air 18 (XR18)',
      totalNodes: graph.nodes.size,
      totalConnections: graph.connections.length,
      activeDiagnostics: diagnostics.map(d => ({
        code: d.code,
        severity: d.severity,
        message: d.message
      })),
      channels: []
    };

    const inputs = Array.from(graph.nodes.values()).filter(n => n.category === 'input');
    const strips = Array.from(graph.nodes.values()).filter(n => n.category === 'strip');

    for (let ch = 1; ch <= 18; ch++) {
      const inNode = inputs.find(n => n.getProperty('channelIndex') === ch);
      const stripNode = strips.find(n => n.getProperty('channelIndex') === ch);

      if (inNode || stripNode) {
        summary.channels.push({
          channelNumber: ch,
          name: stripNode?.getProperty('name') || inNode?.getProperty('name'),
          preampGain: inNode?.getProperty('gain'),
          phantom: inNode?.getProperty('phantom'),
          rtnsw: stripNode?.getProperty('rtnsw'),
          fader: stripNode?.getProperty('fader'),
          muted: stripNode?.getProperty('muted')
        });
      }
    }

    return summary;
  }
}
