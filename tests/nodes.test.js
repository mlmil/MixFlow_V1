import { describe, it, expect } from 'vitest';
import { StageInputNode } from '../src/nodes/StageInputNode.js';
import { USBSendMatrixNode } from '../src/nodes/USBSendMatrixNode.js';
import { AbletonLiveNode } from '../src/nodes/AbletonLiveNode.js';
import { ChannelStripNode } from '../src/nodes/ChannelStripNode.js';
import { OutputBusNode } from '../src/nodes/OutputBusNode.js';
import { NodeRegistry } from '../src/nodes/NodeRegistry.js';

describe('XR18 & Ableton Node Library', () => {
  it('creates StageInputNode with preamps and phantom power', () => {
    const inputNode = new StageInputNode({
      id: 'input-vocal1',
      channelIndex: 1,
      name: 'Lead Vox',
      gain: 32,
      phantom: true,
      hpf: 80
    });

    expect(inputNode.category).toBe('input');
    expect(inputNode.getProperty('phantom')).toBe(true);
    expect(inputNode.getProperty('gain')).toBe(32);
    expect(inputNode.outputs.length).toBe(2); // Preamp Out + Direct Analog IEM Tap
    expect(inputNode.outputs[0].type).toBe('audio');
  });

  it('creates USBSendMatrixNode with configurable tap points', () => {
    const usbMatrix = new USBSendMatrixNode({
      id: 'usb-matrix-1',
      channelIndex: 1,
      tapPoint: 'Analog In'
    });

    expect(usbMatrix.category).toBe('usb_send');
    expect(usbMatrix.getProperty('tapPoint')).toBe('Analog In');
    expect(usbMatrix.inputs.length).toBe(1);
    expect(usbMatrix.outputs.length).toBe(1);
  });

  it('creates AbletonLiveNode with plugins and backing tracks', () => {
    const ableton = new AbletonLiveNode({
      id: 'ableton-vox1',
      trackName: 'Vocal Autotune + FX',
      trackType: 'live_vocal',
      plugins: ['Waves Tune Live', 'CLA-2A', 'Valhalla VintageVerb']
    });

    expect(ableton.category).toBe('daw');
    expect(ableton.getProperty('trackName')).toBe('Vocal Autotune + FX');
    expect(ableton.inputs.length).toBe(1);
    expect(ableton.outputs.length).toBe(1);
  });

  it('creates ChannelStripNode with rtnsw return switch', () => {
    const strip = new ChannelStripNode({
      id: 'strip-ch1',
      channelIndex: 1,
      name: 'Lead Vox Ch1',
      rtnsw: true, // USB return active
      fader: 0,
      muted: false
    });

    expect(strip.category).toBe('strip');
    expect(strip.getProperty('rtnsw')).toBe(true);
    expect(strip.inputs.length).toBe(2); // Analog bypass In + USB Return In
    expect(strip.outputs.length).toBe(2); // Main LR Out + Aux IEM Bus Sends Out
  });

  it('creates OutputBusNode for Main PA and IEMs', () => {
    const mainPA = new OutputBusNode({
      id: 'out-main-pa',
      busType: 'main_lr',
      name: 'Main FOH PA'
    });

    const iemBus = new OutputBusNode({
      id: 'out-iem-lead',
      busType: 'aux_iem',
      auxIndex: 1,
      name: 'Aux 1: Lead Vox IEM'
    });

    expect(mainPA.category).toBe('main');
    expect(mainPA.inputs.length).toBe(1);
    expect(iemBus.category).toBe('bus');
    expect(iemBus.inputs.length).toBe(1);
  });

  it('registers all node types in NodeRegistry and deserializes cleanly', () => {
    const node = new StageInputNode({ id: 'test-node', name: 'Guitar In' });
    const json = node.toJSON();

    const reconstructed = NodeRegistry.deserialize(json);
    expect(reconstructed instanceof StageInputNode).toBe(true);
    expect(reconstructed.getProperty('name')).toBe('Guitar In');
  });
});
