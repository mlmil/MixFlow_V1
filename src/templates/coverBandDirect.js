import { Graph } from '../graph/Graph.js';
import { StageInputNode } from '../nodes/StageInputNode.js';
import { USBSendMatrixNode } from '../nodes/USBSendMatrixNode.js';
import { AbletonLiveNode } from '../nodes/AbletonLiveNode.js';
import { ChannelStripNode } from '../nodes/ChannelStripNode.js';
import { OutputBusNode } from '../nodes/OutputBusNode.js';

export function buildCoverBandDirect() {
  const graph = new Graph();

  const COL_IN = 60;
  const COL_USB = 420;
  const COL_DAW = 800;
  const COL_STRIP = 1220;
  const COL_OUT = 1640;
  const ROW_HEIGHT = 280;

  // Channel Lineup: 5 Vocals, 1 Guitar, 2 Keys (L/R)
  const channelDefs = [
    { ch: 1, name: 'Lead Vox', gain: 32, phantom: true, plugins: ['Antares Auto-Tune', 'CLA-76', 'Pro-Q3'], color: 'var(--color-vocal)' },
    { ch: 2, name: 'Vox 2 (Guitar)', gain: 28, phantom: true, plugins: ['Auto-Tune Access', 'Vocal Rider'], color: 'var(--color-vocal)' },
    { ch: 3, name: 'Vox 3 (Keys)', gain: 28, phantom: true, plugins: ['Auto-Tune Access', 'De-Esser'], color: 'var(--color-vocal)' },
    { ch: 4, name: 'Vox 4 (Bass)', gain: 26, phantom: true, plugins: ['Pitch Correction', 'Compressor'], color: 'var(--color-vocal)' },
    { ch: 5, name: 'Vox 5 (Drums)', gain: 30, phantom: true, plugins: ['Opto Comp', 'EQ'], color: 'var(--color-vocal)' },
    { ch: 6, name: 'Guitar Lead', gain: 18, phantom: false, plugins: ['Neural DSP Quad Cortex VST', 'Tape Delay', 'Room'], color: 'var(--color-guitar)' },
    { ch: 7, name: 'Keys Left', gain: 12, phantom: false, plugins: ['Dimension D Chorus', 'Tape Saturation'], isLine: true, color: 'var(--color-keys)' },
    { ch: 8, name: 'Keys Right', gain: 12, phantom: false, plugins: ['Dimension D Chorus', 'Tape Saturation'], isLine: true, color: 'var(--color-keys)' }
  ];

  // Output Buses
  const mainPA = new OutputBusNode({ id: 'out_main_pa', busType: 'main_lr', name: 'Main FOH PA', x: COL_OUT, y: 80 });
  graph.addNode(mainPA);

  const iem1 = new OutputBusNode({ id: 'out_iem_1', busType: 'aux_iem', auxIndex: 1, name: 'Lead Vox IEM', x: COL_OUT, y: 360 });
  const iem2 = new OutputBusNode({ id: 'out_iem_2', busType: 'aux_iem', auxIndex: 2, name: 'Band IEM', x: COL_OUT, y: 640 });
  graph.addNode(iem1);
  graph.addNode(iem2);

  // Build each signal chain column
  channelDefs.forEach((def, index) => {
    const y = 80 + index * ROW_HEIGHT;

    // 1. Stage Input Node
    const inNode = new StageInputNode({
      id: `in_ch_${def.ch}`,
      channelIndex: def.ch,
      name: def.name,
      gain: def.gain,
      phantom: def.phantom,
      isLineLevel: !!def.isLine,
      x: COL_IN,
      y
    });

    // 2. USB Send Matrix Node (tapped Analog In)
    const usbNode = new USBSendMatrixNode({
      id: `usb_send_${def.ch}`,
      channelIndex: def.ch,
      tapPoint: 'Analog In',
      x: COL_USB,
      y
    });

    // 3. Ableton Live Rig Node
    const dawNode = new AbletonLiveNode({
      id: `daw_track_${def.ch}`,
      trackName: `${def.name} (Live FX)`,
      plugins: def.plugins,
      outputChannel: def.ch,
      x: COL_DAW,
      y
    });

    // 4. XR18 Channel Strip Node (rtnsw = USB Return)
    const stripNode = new ChannelStripNode({
      id: `strip_ch_${def.ch}`,
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

    // Patch 1: Stage Preamp Out -> USB Send In
    graph.connect({
      fromNodeId: inNode.id,
      fromPortId: inNode.outputs[0].id,
      toNodeId: usbNode.id,
      toPortId: usbNode.inputs[0].id,
      color: def.color
    });

    // Patch 2: USB Send Out -> Ableton DAW In
    graph.connect({
      fromNodeId: usbNode.id,
      fromPortId: usbNode.outputs[0].id,
      toNodeId: dawNode.id,
      toPortId: dawNode.inputs[0].id,
      color: 'var(--color-keys)'
    });

    // Patch 3: Ableton DAW Out -> Strip USB Return In
    graph.connect({
      fromNodeId: dawNode.id,
      fromPortId: dawNode.outputs[0].id,
      toNodeId: stripNode.id,
      toPortId: stripNode.inputs.find(p => p.name.includes('USB')).id,
      color: 'var(--color-playback)'
    });

    // Patch 4: Channel Strip Main Out -> Main PA
    graph.connect({
      fromNodeId: stripNode.id,
      fromPortId: stripNode.outputs.find(p => p.name.includes('Main')).id,
      toNodeId: mainPA.id,
      toPortId: mainPA.inputs[0].id,
      color: 'var(--color-main)'
    });

    // Patch 5: Channel Strip Aux Out -> Lead IEM
    if (index === 0 || index === 5 || index === 6) {
      graph.connect({
        fromNodeId: stripNode.id,
        fromPortId: stripNode.outputs.find(p => p.name.includes('Aux')).id,
        toNodeId: iem1.id,
        toPortId: iem1.inputs[0].id,
        color: 'var(--color-iem)'
      });
    }
  });

  // Playback / Backing Track Node (USB 17/18)
  const backingY = 80 + channelDefs.length * ROW_HEIGHT;
  const backingDaw = new AbletonLiveNode({
    id: 'daw_backing_tracks',
    trackName: 'Multitrack Playback + Click',
    plugins: ['Stems Player', 'Sidechain Glue', 'Click Out Ch18'],
    outputChannel: 17,
    isStereoOut: true,
    x: COL_DAW,
    y: backingY
  });

  const auxStrip = new ChannelStripNode({
    id: 'strip_aux_playback',
    channelIndex: 17,
    name: 'DAW Backing Tracks',
    isStereoPair: true,
    rtnsw: true,
    fader: -6,
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

  return graph;
}
