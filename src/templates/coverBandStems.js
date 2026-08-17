import { Graph } from '../graph/Graph.js';
import { StageInputNode } from '../nodes/StageInputNode.js';
import { USBSendMatrixNode } from '../nodes/USBSendMatrixNode.js';
import { AbletonLiveNode } from '../nodes/AbletonLiveNode.js';
import { ChannelStripNode } from '../nodes/ChannelStripNode.js';
import { OutputBusNode } from '../nodes/OutputBusNode.js';

export function buildCoverBandStems() {
  const graph = new Graph();

  const COL_IN = 60;
  const COL_USB = 420;
  const COL_DAW = 800;
  const COL_STRIP = 1220;
  const COL_OUT = 1640;

  const mainPA = new OutputBusNode({ id: 'out_main_pa_stem', busType: 'main_lr', name: 'Main FOH PA', x: COL_OUT, y: 150 });
  graph.addNode(mainPA);

  // Group 1: 5 Vocals Stem -> USB 1/2 Return (Row 0)
  const voxIn = new StageInputNode({ id: 'in_vox_all', channelIndex: 1, name: 'Vocals 1-5 (Stage)', gain: 30, phantom: true, x: COL_IN, y: 80 });
  const voxUsb = new USBSendMatrixNode({ id: 'usb_vox_all', channelIndex: 1, tapPoint: 'Analog In', x: COL_USB, y: 80 });
  const voxDaw = new AbletonLiveNode({ id: 'daw_vox_stem', trackName: 'Vocals Group Submix', plugins: ['Autotune', 'Bus Glue Comp', 'Plate Reverb'], outputChannel: 1, isStereoOut: true, x: COL_DAW, y: 80 });
  const voxStrip = new ChannelStripNode({ id: 'strip_vox_stem', channelIndex: 1, name: 'Vocals Stem', isStereoPair: true, rtnsw: true, x: COL_STRIP, y: 80 });

  graph.addNode(voxIn);
  graph.addNode(voxUsb);
  graph.addNode(voxDaw);
  graph.addNode(voxStrip);

  graph.connect({ fromNodeId: voxIn.id, fromPortId: voxIn.outputs[0].id, toNodeId: voxUsb.id, toPortId: voxUsb.inputs[0].id, color: 'var(--color-vocal)' });
  graph.connect({ fromNodeId: voxUsb.id, fromPortId: voxUsb.outputs[0].id, toNodeId: voxDaw.id, toPortId: voxDaw.inputs[0].id, color: 'var(--color-keys)' });
  graph.connect({ fromNodeId: voxDaw.id, fromPortId: voxDaw.outputs[0].id, toNodeId: voxStrip.id, toPortId: voxStrip.inputs[0].id, color: 'var(--color-playback)' });
  graph.connect({ fromNodeId: voxStrip.id, fromPortId: voxStrip.outputs.find(p => p.name.includes('Main')).id, toNodeId: mainPA.id, toPortId: mainPA.inputs[0].id, color: 'var(--color-main)' });

  // Group 2: Band Stem -> USB 3/4 Return (Row 1)
  const bandIn = new StageInputNode({ id: 'in_band_all', channelIndex: 6, name: 'Guitar & Keys (Stage)', gain: 16, phantom: false, x: COL_IN, y: 380 });
  const bandUsb = new USBSendMatrixNode({ id: 'usb_band_all', channelIndex: 6, tapPoint: 'Analog In', x: COL_USB, y: 380 });
  const bandDaw = new AbletonLiveNode({ id: 'daw_band_stem', trackName: 'Band Group Submix', plugins: ['Amp Modeler', 'Stereo Imager'], outputChannel: 3, isStereoOut: true, x: COL_DAW, y: 380 });
  const bandStrip = new ChannelStripNode({ id: 'strip_band_stem', channelIndex: 3, name: 'Band Stem', isStereoPair: true, rtnsw: true, x: COL_STRIP, y: 380 });

  graph.addNode(bandIn);
  graph.addNode(bandUsb);
  graph.addNode(bandDaw);
  graph.addNode(bandStrip);

  graph.connect({ fromNodeId: bandIn.id, fromPortId: bandIn.outputs[0].id, toNodeId: bandUsb.id, toPortId: bandUsb.inputs[0].id, color: 'var(--color-guitar)' });
  graph.connect({ fromNodeId: bandUsb.id, fromPortId: bandUsb.outputs[0].id, toNodeId: bandDaw.id, toPortId: bandDaw.inputs[0].id, color: 'var(--color-keys)' });
  graph.connect({ fromNodeId: bandDaw.id, fromPortId: bandDaw.outputs[0].id, toNodeId: bandStrip.id, toPortId: bandStrip.inputs[0].id, color: 'var(--color-playback)' });
  graph.connect({ fromNodeId: bandStrip.id, fromPortId: bandStrip.outputs.find(p => p.name.includes('Main')).id, toNodeId: mainPA.id, toPortId: mainPA.inputs[0].id, color: 'var(--color-main)' });

  return graph;
}
