import { Graph } from '../graph/Graph.js';
import { StageInputNode } from '../nodes/StageInputNode.js';
import { ChannelStripNode } from '../nodes/ChannelStripNode.js';
import { USBSendMatrixNode } from '../nodes/USBSendMatrixNode.js';
import { OutputBusNode } from '../nodes/OutputBusNode.js';

export class ConfigImporter {
  static importJSON(jsonData) {
    const graph = new Graph();
    if (!jsonData || !jsonData.channels) return graph;

    let xOffset = 50;
    let yOffset = 50;

    Object.entries(jsonData.channels).forEach(([key, chData]) => {
      const chIndex = chData.channelNumber || (parseInt(key, 10) + 1);

      const inputNode = new StageInputNode({
        id: `imported_in_${chIndex}`,
        channelIndex: chIndex,
        name: chData.name || `Ch ${chIndex}`,
        gain: chData.preampGain || 0,
        phantom: !!chData.phantom,
        invert: !!chData.invert,
        hpf: chData.hpf || 0,
        x: xOffset,
        y: yOffset
      });

      const stripNode = new ChannelStripNode({
        id: `imported_strip_${chIndex}`,
        channelIndex: chIndex,
        name: chData.name || `Ch ${chIndex}`,
        rtnsw: chData.rtnsw === 1 || chData.rtnsw === true,
        fader: chData.fader || 0,
        muted: chData.on === false,
        x: xOffset + 900,
        y: yOffset
      });

      graph.addNode(inputNode);
      graph.addNode(stripNode);

      yOffset += 160;
    });

    const mainPA = new OutputBusNode({
      id: 'imported_main_pa',
      busType: 'main_lr',
      name: 'Main FOH PA',
      masterFader: jsonData.mainLR?.fader || 0,
      x: xOffset + 1300,
      y: 100
    });
    graph.addNode(mainPA);

    return graph;
  }
}
