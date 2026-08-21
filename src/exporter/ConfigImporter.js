import { unzipSync, gunzipSync, strFromU8 } from 'fflate';
import { Graph } from '../graph/Graph.js';
import { StageInputNode } from '../nodes/StageInputNode.js';
import { ChannelStripNode } from '../nodes/ChannelStripNode.js';
import { USBSendMatrixNode } from '../nodes/USBSendMatrixNode.js';
import { OutputBusNode } from '../nodes/OutputBusNode.js';
import { AbletonLiveNode } from '../nodes/AbletonLiveNode.js';

export class ConfigImporter {
  static async import(rawContent) {
    // If it's binary (ArrayBuffer or Uint8Array, e.g. .msz file)
    if (rawContent instanceof ArrayBuffer || rawContent instanceof Uint8Array) {
      const u8 = rawContent instanceof Uint8Array ? rawContent : new Uint8Array(rawContent);

      // Try GZIP decompression
      if (u8[0] === 0x1f && u8[1] === 0x8b) {
        try {
          const decompressed = gunzipSync(u8);
          const text = strFromU8(decompressed);
          return this.import(text);
        } catch (e) {
          console.warn('GZIP decompression failed:', e);
        }
      }

      // Try PKZip decompression
      if (u8[0] === 0x50 && u8[1] === 0x4b) {
        try {
          const unzipped = unzipSync(u8);
          for (const filename of Object.keys(unzipped)) {
            if (filename.endsWith('.json') || filename.endsWith('.scn') || !filename.includes('.')) {
              const text = strFromU8(unzipped[filename]);
              if (text && text.trim().length > 0) {
                const res = await this.import(text);
                if (res && res.nodes && res.nodes.size > 0) return res;
              }
            }
          }
        } catch (e) {
          console.warn('ZIP decompression failed:', e);
        }
      }

      // Fallback: try decoding as UTF-8
      try {
        const decoder = new TextDecoder('utf-8');
        return this.import(decoder.decode(u8));
      } catch (e) {
        console.error('Binary decode failed:', e);
      }
      return new Graph();
    }

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
    } else if (typeof rawContent === 'object' && rawContent !== null) {
      return this.importJSON(rawContent);
    }

    return new Graph();
  }

  static importJSON(jsonData) {
    if (!jsonData) return new Graph();

    // 1. Direct MixFlow graph serialization
    if (jsonData.nodes && Array.isArray(jsonData.nodes)) {
      return Graph.fromJSON(jsonData);
    }

    // 2. Native Mixing Station Official Scene Format (json.ch or json.modelVersion)
    if (jsonData.ch && Array.isArray(jsonData.ch)) {
      return this.importMixingStationNativeScene(jsonData);
    }

    // 3. Extract channel definitions from generic Mixing Station JSON structure
    const extractedChannels = this.extractChannelsFromJSON(jsonData);
    const channelsToBuild = Object.keys(extractedChannels).length > 0
      ? extractedChannels
      : this.createDefaultChannelMap();

    const graph = new Graph();
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
      masterFader: jsonData.mainLR?.fader || jsonData.master?.fader || 0,
      x: COL_OUT,
      y: 80
    });
    graph.addNode(mainPA);

    let rowIndex = 0;

    Object.entries(channelsToBuild).forEach(([chKey, chData]) => {
      const chIndex = parseInt(chKey, 10);
      if (isNaN(chIndex) || chIndex < 1 || chIndex > 18) return;

      const yPos = 80 + rowIndex * ROW_HEIGHT;
      const isUSB = chData.rtnsw === 1 || chData.rtnsw === true || chData.source === 'usb' || chData.src === 'usb';
      const name = chData.name || `Ch ${chIndex}`;

      const inputNode = new StageInputNode({
        id: `imported_in_${chIndex}`,
        channelIndex: chIndex,
        name: name,
        gain: chData.preampGain !== undefined ? chData.preampGain : (chData.gain || 24),
        phantom: !!chData.phantom || !!chData['48v'],
        invert: !!chData.invert || !!chData.inv,
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
        trackName: `${name} (Live FX)`,
        outputChannel: chIndex,
        x: COL_DAW,
        y: yPos
      });

      const stripNode = new ChannelStripNode({
        id: `imported_strip_${chIndex}`,
        channelIndex: chIndex,
        name: name,
        rtnsw: isUSB,
        fader: chData.fader !== undefined ? chData.fader : 0,
        muted: chData.on === false || chData.mute === true,
        x: COL_STRIP,
        y: yPos
      });

      graph.addNode(inputNode);
      graph.addNode(usbNode);
      graph.addNode(dawNode);
      graph.addNode(stripNode);

      // Connect signal flow
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

  static importMixingStationNativeScene(sceneJson) {
    const graph = new Graph();
    const chItems = sceneJson.ch || [];

    const inputs = chItems.filter(item => item.ref?.type === 0 || (!item.ref && item.data?.name?.fixed?.startsWith('Ch')));
    const buses = chItems.filter(item => item.ref?.type === 4 || (!item.ref && item.data?.name?.fixed?.startsWith('Bus')));
    const mainItem = chItems.find(item => item.ref?.type === 6 || item.data?.name?.fixed?.startsWith('Main'));

    const COL_IN = 60;
    const COL_USB = 440;
    const COL_DAW = 840;
    const COL_STRIP = 1260;
    const COL_OUT = 1700;
    const ROW_HEIGHT = 290;

    // Build Main FOH PA
    const mainFader = mainItem?.data?.main?.generic?.['mix.lvl'] ?? 0;
    const mainPA = new OutputBusNode({
      id: 'ms_main_pa',
      busType: 'main_lr',
      name: 'Main FOH PA',
      masterFader: Math.round(mainFader * 10) / 10,
      x: COL_OUT,
      y: 80
    });
    graph.addNode(mainPA);

    // Build IEM Buses
    const createdIEMs = [];
    buses.slice(0, 6).forEach((bItem, bIdx) => {
      const busNum = (bItem.ref?.offset ?? bIdx) + 1;
      const busName = bItem.data?.name?.generic?.name || bItem.data?.name?.fixed || `Aux ${busNum}`;
      const iemNode = new OutputBusNode({
        id: `ms_iem_bus_${busNum}`,
        busType: 'aux_iem',
        auxIndex: busNum,
        name: `Aux ${busNum}: ${busName} (IEM)`,
        x: COL_OUT,
        y: 400 + bIdx * 200
      });
      graph.addNode(iemNode);
      createdIEMs.push(iemNode);
    });

    // Build Input Channels (1-16)
    inputs.slice(0, 16).forEach((item, idx) => {
      const chNum = (item.ref?.offset ?? idx) + 1;
      const yPos = 80 + idx * ROW_HEIGHT;

      const rawName = item.data?.name?.generic?.name || item.data?.name?.fixed || `Ch ${chNum}`;
      const isUSB = item.data?.routing?.generic?.['preamp.retOn'] === true || item.data?.routing?.mixer?.['cfg.srcSel'] === 1;
      const rawFader = item.data?.main?.generic?.['mix.lvl'] ?? 0;
      const fader = Math.round(rawFader * 10) / 10;
      const isMuted = item.data?.main?.generic?.['mix.rawOn'] === false;

      const headampGain = item.data?.headamp?.gain ?? item.data?.headamp?.generic?.gain ?? (chNum <= 8 ? 28 : 20);
      const isPhantom = item.data?.headamp?.phantom === true || item.data?.headamp?.generic?.phantom === true;
      const hpfFreq = item.data?.eq?.preampFilters?.['0.freq'] || (chNum <= 8 ? 80 : 0);

      const inputNode = new StageInputNode({
        id: `ms_in_${chNum}`,
        channelIndex: chNum,
        name: rawName,
        gain: headampGain,
        phantom: isPhantom,
        hpf: hpfFreq,
        x: COL_IN,
        y: yPos
      });

      const usbNode = new USBSendMatrixNode({
        id: `ms_usb_${chNum}`,
        channelIndex: chNum,
        tapPoint: 'Analog In',
        x: COL_USB,
        y: yPos
      });

      const dawNode = new AbletonLiveNode({
        id: `ms_daw_${chNum}`,
        trackName: `${rawName} (DAW Live FX)`,
        outputChannel: chNum,
        isStereoOut: isUSB,
        x: COL_DAW,
        y: yPos
      });

      const stripNode = new ChannelStripNode({
        id: `ms_strip_${chNum}`,
        channelIndex: chNum,
        name: rawName,
        rtnsw: isUSB,
        fader: fader,
        muted: isMuted,
        x: COL_STRIP,
        y: yPos
      });

      graph.addNode(inputNode);
      graph.addNode(usbNode);
      graph.addNode(dawNode);
      graph.addNode(stripNode);

      // Preamp ➔ USB Send Matrix
      graph.connect({
        fromNodeId: inputNode.id,
        fromPortId: inputNode.outputs[0].id,
        toNodeId: usbNode.id,
        toPortId: usbNode.inputs[0].id
      });

      // 0ms Direct Preamp Split ➔ Performer's IEM Bus (if matching vocalist/instrument)
      if (createdIEMs[idx]) {
        const iemPort = inputNode.outputs.find(p => p.type === 'audio_direct') || inputNode.outputs[0];
        graph.connect({
          fromNodeId: inputNode.id,
          fromPortId: iemPort.id,
          toNodeId: createdIEMs[idx].id,
          toPortId: createdIEMs[idx].inputs[0].id
        });
      }

      // USB Send ➔ Ableton Live Input
      graph.connect({
        fromNodeId: usbNode.id,
        fromPortId: usbNode.outputs[0].id,
        toNodeId: dawNode.id,
        toPortId: dawNode.inputs[0].id
      });

      // Ableton Live Return ➔ Mixer Channel Strip (USB socket)
      const stripUsbPort = stripNode.inputs.find(p => p.type === 'usb') || stripNode.inputs[0];
      graph.connect({
        fromNodeId: dawNode.id,
        fromPortId: dawNode.outputs[0].id,
        toNodeId: stripNode.id,
        toPortId: stripUsbPort.id
      });

      // Mixer Strip Output ➔ Main FOH PA
      graph.connect({
        fromNodeId: stripNode.id,
        fromPortId: stripNode.outputs[0].id,
        toNodeId: mainPA.id,
        toPortId: mainPA.inputs[0].id
      });
    });

    return graph;
  }

  static extractChannelsFromJSON(data) {
    const channels = {};
    if (!data || typeof data !== 'object') return channels;

    const src = data.channels || data.scene?.channels || data.data?.channels || data;

    if (src && typeof src === 'object' && !Array.isArray(src)) {
      const isZeroIndexed = src['0'] !== undefined;
      Object.entries(src).forEach(([k, v]) => {
        if (v && typeof v === 'object') {
          let chNum = v.channelNumber;
          if (chNum === undefined) {
            const parsed = parseInt(k.replace(/\D/g, ''), 10);
            if (!isNaN(parsed)) {
              chNum = isZeroIndexed ? parsed + 1 : parsed;
            }
          }
          if (chNum >= 1 && chNum <= 18) {
            channels[chNum] = { ...v, channelNumber: chNum };
          }
        }
      });
      if (Object.keys(channels).length > 0) return channels;
    }

    // Recursive scan fallback
    const scan = (obj, depth = 0) => {
      if (!obj || depth > 6) return;
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            if (item.name || item.fader !== undefined || item.gain !== undefined) {
              const chNum = item.channelNumber || item.index || (idx + 1);
              if (chNum >= 1 && chNum <= 18) {
                channels[chNum] = { ...channels[chNum], ...item, channelNumber: chNum };
              }
            }
            scan(item, depth + 1);
          }
        });
        return;
      }
      if (typeof obj === 'object') {
        Object.entries(obj).forEach(([k, v]) => {
          if (v && typeof v === 'object') {
            const match = k.match(/^(?:ch|channel)?_?(\d+)$/i);
            if (match) {
              const parsed = parseInt(match[1], 10);
              const chNum = parsed === 0 ? 1 : parsed;
              if (chNum >= 1 && chNum <= 18) {
                channels[chNum] = { ...channels[chNum], ...v, channelNumber: chNum };
              }
            }
            scan(v, depth + 1);
          }
        });
      }
    };

    scan(data);
    return channels;
  }

  static createDefaultChannelMap() {
    const defs = {};
    for (let i = 1; i <= 8; i++) {
      defs[i] = { name: `Channel ${i}`, preampGain: 24, rtnsw: true, fader: 0 };
    }
    return defs;
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

    return this.importJSON(channels);
  }
}
