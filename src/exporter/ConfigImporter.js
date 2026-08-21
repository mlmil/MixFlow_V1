import { Graph } from '../graph/Graph.js';
import { StageInputNode } from '../nodes/StageInputNode.js';
import { ChannelStripNode } from '../nodes/ChannelStripNode.js';
import { USBSendMatrixNode } from '../nodes/USBSendMatrixNode.js';
import { OutputBusNode } from '../nodes/OutputBusNode.js';
import { AbletonLiveNode } from '../nodes/AbletonLiveNode.js';

export class ConfigImporter {
  static import(rawContent) {
    if (typeof rawContent === 'string') {
      const trimmed = rawContent.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.importJSON(parsed);
        } catch (e) {
          // Fall through to OSC parser
        }
      }
      return this.importOSCText(trimmed);
    } else if (typeof rawContent === 'object') {
      return this.importJSON(rawContent);
    }
    return new Graph();
  }

  static importJSON(jsonData) {
    // If it's a full MixFlow graph serialization
    if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
      return Graph.fromJSON(jsonData);
    }

    const graph = new Graph();
    if (!jsonData || !jsonData.channels) return graph;

    const COL_IN = 60;
    const COL_USB = 420;
    const COL_DAW = 800;
    const COL_STRIP = 1220;
    const COL_OUT = 1640;
    const ROW_HEIGHT = 280;

    const mainPA = new OutputBusNode({
      id: 'imported_main_pa',
      busType: 'main_lr',
      name: 'Main FOH PA',
      masterFader: jsonData.mainLR?.fader || 0,
      x: COL_OUT,
      y: 80
    });
    graph.addNode(mainPA);

    let rowIndex = 0;

    Object.entries(jsonData.channels).forEach(([key, chData]) => {
      const chIndex = chData.channelNumber || (parseInt(key, 10) + 1);
      const yPos = 80 + rowIndex * ROW_HEIGHT;
      const isUSB = chData.rtnsw === 1 || chData.rtnsw === true;

      const inputNode = new StageInputNode({
        id: `imported_in_${chIndex}`,
        channelIndex: chIndex,
        name: chData.name || `Ch ${chIndex}`,
        gain: chData.preampGain || 24,
        phantom: !!chData.phantom,
        invert: !!chData.invert,
        hpf: chData.hpf || 0,
        x: COL_IN,
        y: yPos
      });

      const usbNode = new USBSendMatrixNode({
        id: `imported_usb_${chIndex}`,
        channelIndex: chIndex,
        tapPoint: chData.usbTap || 'Analog In',
        x: COL_USB,
        y: yPos
      });

      const dawNode = new AbletonLiveNode({
        id: `imported_daw_${chIndex}`,
        trackName: `${chData.name || `Ch ${chIndex}`} FX`,
        outputChannel: chIndex,
        x: COL_DAW,
        y: yPos
      });

      const stripNode = new ChannelStripNode({
        id: `imported_strip_${chIndex}`,
        channelIndex: chIndex,
        name: chData.name || `Ch ${chIndex}`,
        rtnsw: isUSB,
        fader: chData.fader !== undefined ? chData.fader : 0,
        muted: chData.on === false,
        x: COL_STRIP,
        y: yPos
      });

      graph.addNode(inputNode);
      graph.addNode(usbNode);
      graph.addNode(dawNode);
      graph.addNode(stripNode);

      // Auto-connect signal flow
      graph.connect({
        fromNodeId: inputNode.id,
        fromPortId: inputNode.outputs[0].id,
        toNodeId: usbNode.id,
        toPortId: usbNode.inputs[0].id
      });

      graph.connect({
        fromNodeId: usbNode.id,
        fromPortId: usbNode.outputs[0].id,
        toNodeId: dawNode.id,
        toPortId: dawNode.inputs[0].id
      });

      graph.connect({
        fromNodeId: dawNode.id,
        fromPortId: dawNode.outputs[0].id,
        toNodeId: stripNode.id,
        toPortId: stripNode.inputs.find(p => p.type === 'usb')?.id
      });

      graph.connect({
        fromNodeId: stripNode.id,
        fromPortId: stripNode.outputs[0].id,
        toNodeId: mainPA.id,
        toPortId: mainPA.inputs[0].id
      });

      rowIndex++;
    });

    return graph;
  }

  static importOSCText(oscText) {
    const channels = {};
    const lines = oscText.split('\n');

    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      // Parse /ch/01/config/name "Kyle"
      const nameMatch = line.match(/\/ch\/(\d+)\/config\/name\s+"?([^"]+)"?/);
      if (nameMatch) {
        const ch = parseInt(nameMatch[1], 10);
        channels[ch] = channels[ch] || {};
        channels[ch].name = nameMatch[2].trim();
      }

      // Parse /ch/01/config/rtnsw 1
      const rtnMatch = line.match(/\/ch\/(\d+)\/config\/rtnsw\s+(\d+)/);
      if (rtnMatch) {
        const ch = parseInt(rtnMatch[1], 10);
        channels[ch] = channels[ch] || {};
        channels[ch].rtnsw = parseInt(rtnMatch[2], 10) === 1;
      }

      // Parse /headamp/01/gain
      const gainMatch = line.match(/\/headamp\/(\d+)\/gain\s+([\d.]+)/);
      if (gainMatch) {
        const ch = parseInt(gainMatch[1], 10);
        channels[ch] = channels[ch] || {};
        channels[ch].preampGain = Math.round(parseFloat(gainMatch[2]) * 72 - 12);
      }

      // Parse /headamp/01/phantom ON
      const phMatch = line.match(/\/headamp\/(\d+)\/phantom\s+(\w+)/);
      if (phMatch) {
        const ch = parseInt(phMatch[1], 10);
        channels[ch] = channels[ch] || {};
        channels[ch].phantom = phMatch[2].toUpperCase() === 'ON' || phMatch[2] === '1';
      }
    });

    return this.importJSON({ channels });
  }
}
