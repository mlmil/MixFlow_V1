import { Graph } from '../graph/Graph.js';
import { StageInputNode } from '../nodes/StageInputNode.js';
import { USBSendMatrixNode } from '../nodes/USBSendMatrixNode.js';
import { AbletonLiveNode } from '../nodes/AbletonLiveNode.js';
import { ChannelStripNode } from '../nodes/ChannelStripNode.js';
import { OutputBusNode } from '../nodes/OutputBusNode.js';

export function buildZeroLatencyIEM() {
  const graph = new Graph();

  // Column Positions (Spacious, Zero Overlap)
  const COL_IN = 60;
  const COL_USB = 420;
  const COL_DAW = 800;
  const COL_STRIP = 1220;
  const COL_OUT = 1640;
  const ROW_HEIGHT = 280;

  // Output Buses (Column 5)
  const mainPA = new OutputBusNode({ id: 'out_main_pa_zl', busType: 'main_lr', name: 'Main FOH PA (Stereo L/R)', x: COL_OUT, y: 80 });
  graph.addNode(mainPA);

  const iem1 = new OutputBusNode({ id: 'out_iem_1_zl', busType: 'aux_iem', auxIndex: 1, name: 'Aux 1: Lead Vox IEM (0ms Direct)', x: COL_OUT, y: 360 });
  const iem2 = new OutputBusNode({ id: 'out_iem_2_zl', busType: 'aux_iem', auxIndex: 2, name: 'Aux 2: Band IEM (0ms Direct)', x: COL_OUT, y: 640 });
  graph.addNode(iem1);
  graph.addNode(iem2);

  // 1. LEAD VOCAL WITH STEREO EFFECTS (Row 0: Ch 1 in -> Ableton Ext. Out 1/2 -> XR18 Strip 1/2)
  const leadVoxIn = new StageInputNode({
    id: 'in_lead_vox',
    channelIndex: 1,
    name: 'Lead Vox (Mic 1)',
    gain: 32,
    phantom: true,
    x: COL_IN,
    y: 80
  });

  const leadUsbSend = new USBSendMatrixNode({
    id: 'usb_send_lead',
    channelIndex: 1,
    tapPoint: 'Analog In',
    x: COL_USB,
    y: 80
  });

  const leadAbleton = new AbletonLiveNode({
    id: 'daw_lead_stereo',
    trackName: 'Lead Vox (Autotune + Stereo Verb/Delay)',
    plugins: ['Antares Auto-Tune Live', 'CLA-76 Vocal Comp', 'Valhalla Stereo VintageVerb', 'MicroShift Widener'],
    isStereoOut: true,
    outputChannel: 1,
    x: COL_DAW,
    y: 80
  });

  const leadStereoStrip = new ChannelStripNode({
    id: 'strip_lead_stereo',
    channelIndex: 1,
    name: 'Lead Vox FX Return',
    isStereoPair: true,
    rtnsw: true,
    fader: 0,
    x: COL_STRIP,
    y: 80
  });

  graph.addNode(leadVoxIn);
  graph.addNode(leadUsbSend);
  graph.addNode(leadAbleton);
  graph.addNode(leadStereoStrip);

  // Lead: Preamp -> USB Send
  graph.connect({
    fromNodeId: leadVoxIn.id,
    fromPortId: leadVoxIn.outputs[0].id,
    toNodeId: leadUsbSend.id,
    toPortId: leadUsbSend.inputs[0].id,
    color: 'var(--color-vocal)'
  });

  // Lead: Direct 0ms Preamp Split -> Lead IEM
  graph.connect({
    fromNodeId: leadVoxIn.id,
    fromPortId: leadVoxIn.outputs[1].id,
    toNodeId: iem1.id,
    toPortId: iem1.inputs[0].id,
    color: 'var(--color-iem)'
  });

  // Lead: USB Send -> Ableton Ext. In 1
  graph.connect({
    fromNodeId: leadUsbSend.id,
    fromPortId: leadUsbSend.outputs[0].id,
    toNodeId: leadAbleton.id,
    toPortId: leadAbleton.inputs[0].id,
    color: 'var(--color-keys)'
  });

  // Lead: Ableton Ext. Out 1/2 -> XR18 USB Return 1/2
  graph.connect({
    fromNodeId: leadAbleton.id,
    fromPortId: leadAbleton.outputs[0].id,
    toNodeId: leadStereoStrip.id,
    toPortId: leadStereoStrip.inputs[0].id,
    color: 'var(--color-playback)'
  });

  // Lead: Strip Stereo Out -> Main FOH PA
  graph.connect({
    fromNodeId: leadStereoStrip.id,
    fromPortId: leadStereoStrip.outputs.find(p => p.name.includes('Main')).id,
    toNodeId: mainPA.id,
    toPortId: mainPA.inputs[0].id,
    color: 'var(--color-main)'
  });

  // 2. ADDITIONAL BAND CHANNELS (Rows 1-6)
  const bandChannels = [
    { ch: 3, name: 'Vox 2 (Guitar)', gain: 28, phantom: true, plugins: ['Auto-Tune Access', 'Vocal Rider'], color: 'var(--color-vocal)' },
    { ch: 4, name: 'Vox 3 (Keys)', gain: 28, phantom: true, plugins: ['Auto-Tune Access', 'De-Esser'], color: 'var(--color-vocal)' },
    { ch: 5, name: 'Vox 4 (Bass)', gain: 26, phantom: true, plugins: ['Pitch Correction', 'Compressor'], color: 'var(--color-vocal)' },
    { ch: 6, name: 'Vox 5 (Drums)', gain: 30, phantom: true, plugins: ['Opto Comp', 'EQ'], color: 'var(--color-vocal)' },
    { ch: 7, name: 'Guitar Lead', gain: 18, phantom: false, plugins: ['Neural DSP Quad Cortex VST', 'Stereo Delay'], color: 'var(--color-guitar)' },
    { ch: 8, name: 'Keys Stereo', gain: 12, phantom: false, plugins: ['Dimension D Chorus', 'Stereo Imager'], isLine: true, color: 'var(--color-keys)' }
  ];

  bandChannels.forEach((def, index) => {
    const y = 80 + (index + 1) * ROW_HEIGHT;

    const inNode = new StageInputNode({
      id: `in_ch_zl_${def.ch}`,
      channelIndex: def.ch,
      name: def.name,
      gain: def.gain,
      phantom: def.phantom,
      isLineLevel: !!def.isLine,
      x: COL_IN,
      y
    });

    const usbNode = new USBSendMatrixNode({
      id: `usb_send_zl_${def.ch}`,
      channelIndex: def.ch,
      tapPoint: 'Analog In',
      x: COL_USB,
      y
    });

    const dawNode = new AbletonLiveNode({
      id: `daw_track_zl_${def.ch}`,
      trackName: `${def.name} (Live FX)`,
      plugins: def.plugins,
      outputChannel: def.ch,
      x: COL_DAW,
      y
    });

    const stripNode = new ChannelStripNode({
      id: `strip_ch_zl_${def.ch}`,
      channelIndex: def.ch,
      name: def.name,
      rtnsw: true,
      fader: 0,
      x: COL_STRIP,
      y
    });

    graph.addNode(inNode);
    graph.addNode(usbNode);
    graph.addNode(dawNode);
    graph.addNode(stripNode);

    // Direct Preamp Split to Band IEM
    graph.connect({
      fromNodeId: inNode.id,
      fromPortId: inNode.outputs[1].id,
      toNodeId: iem2.id,
      toPortId: iem2.inputs[0].id,
      color: 'var(--color-iem)'
    });

    // In -> USB Send -> DAW -> Strip -> Main PA
    graph.connect({
      fromNodeId: inNode.id,
      fromPortId: inNode.outputs[0].id,
      toNodeId: usbNode.id,
      toPortId: usbNode.inputs[0].id,
      color: def.color
    });

    graph.connect({
      fromNodeId: usbNode.id,
      fromPortId: usbNode.outputs[0].id,
      toNodeId: dawNode.id,
      toPortId: dawNode.inputs[0].id,
      color: 'var(--color-keys)'
    });

    graph.connect({
      fromNodeId: dawNode.id,
      fromPortId: dawNode.outputs[0].id,
      toNodeId: stripNode.id,
      toPortId: stripNode.inputs.find(p => p.name.includes('USB')).id,
      color: 'var(--color-playback)'
    });

    graph.connect({
      fromNodeId: stripNode.id,
      fromPortId: stripNode.outputs.find(p => p.name.includes('Main')).id,
      toNodeId: mainPA.id,
      toPortId: mainPA.inputs[0].id,
      color: 'var(--color-main)'
    });
  });

  // Playback / Backing Tracks (Row 7: USB 17/18)
  const backingY = 80 + (bandChannels.length + 1) * ROW_HEIGHT;

  const backingDaw = new AbletonLiveNode({
    id: 'daw_backing_zl',
    trackName: 'Multitrack Playback + Click',
    plugins: ['Backing Track Stems', 'Stereo Click Track'],
    outputChannel: 17,
    isStereoOut: true,
    x: COL_DAW,
    y: backingY
  });

  const auxStrip = new ChannelStripNode({
    id: 'strip_aux_backing_zl',
    channelIndex: 17,
    name: 'DAW Backing Tracks',
    isStereoPair: true,
    rtnsw: true,
    fader: -4,
    x: COL_STRIP,
    y: backingY
  });

  graph.addNode(backingDaw);
  graph.addNode(auxStrip);

  graph.connect({
    fromNodeId: backingDaw.id,
    fromPortId: backingDaw.outputs[0].id,
    toNodeId: auxStrip.id,
    toPortId: auxStrip.inputs[0].id,
    color: 'var(--color-playback)'
  });

  graph.connect({
    fromNodeId: auxStrip.id,
    fromPortId: auxStrip.outputs.find(p => p.name.includes('Main')).id,
    toNodeId: mainPA.id,
    toPortId: mainPA.inputs[0].id,
    color: 'var(--color-main)'
  });

  graph.connect({
    fromNodeId: auxStrip.id,
    fromPortId: auxStrip.outputs.find(p => p.name.includes('Aux')).id,
    toNodeId: iem1.id,
    toPortId: iem1.inputs[0].id,
    color: 'var(--color-iem)'
  });

  return graph;
}
