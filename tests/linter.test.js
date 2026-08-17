import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../src/graph/Graph.js';
import { StageInputNode } from '../src/nodes/StageInputNode.js';
import { USBSendMatrixNode } from '../src/nodes/USBSendMatrixNode.js';
import { AbletonLiveNode } from '../src/nodes/AbletonLiveNode.js';
import { ChannelStripNode } from '../src/nodes/ChannelStripNode.js';
import { OutputBusNode } from '../src/nodes/OutputBusNode.js';
import { RoutingLinter } from '../src/linter/RoutingLinter.js';

describe('Real-Time Routing Linter & Error Detection', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('detects dead USB return when rtnsw is active but no DAW connected', () => {
    const strip = new ChannelStripNode({
      id: 'strip-ch1',
      channelIndex: 1,
      rtnsw: true // Listening to USB
    });
    graph.addNode(strip);

    const diagnostics = RoutingLinter.lint(graph);
    const deadReturn = diagnostics.find(d => d.code === 'ERR_DEAD_RETURN');

    expect(deadReturn).toBeDefined();
    expect(deadReturn.nodeId).toBe('strip-ch1');
    expect(deadReturn.severity).toBe('error');
  });

  it('detects post-fader tap warning for live processing tracks', () => {
    const input = new StageInputNode({ id: 'in-vox', channelIndex: 1, name: 'Lead Vox' });
    const usb = new USBSendMatrixNode({ id: 'usb-1', channelIndex: 1, tapPoint: 'Post-Fader' });
    const daw = new AbletonLiveNode({ id: 'daw-autotune', trackType: 'live_vocal' });

    graph.addNode(input);
    graph.addNode(usb);
    graph.addNode(daw);

    graph.connect({
      fromNodeId: 'in-vox',
      fromPortId: input.outputs[0].id,
      toNodeId: 'usb-1',
      toPortId: usb.inputs[0].id
    });

    graph.connect({
      fromNodeId: 'usb-1',
      fromPortId: usb.outputs[0].id,
      toNodeId: 'daw-autotune',
      toPortId: daw.inputs[0].id
    });

    const diagnostics = RoutingLinter.lint(graph);
    const postFaderWarn = diagnostics.find(d => d.code === 'WARN_TAP_POST_FADER');

    expect(postFaderWarn).toBeDefined();
    expect(postFaderWarn.severity).toBe('warning');
  });

  it('detects phantom power hazard on line-level instruments', () => {
    const keysIn = new StageInputNode({
      id: 'in-keys',
      channelIndex: 7,
      name: 'Nord Keys L',
      isLineLevel: true,
      phantom: true // Dangerous +48V on keyboard
    });
    graph.addNode(keysIn);

    const diagnostics = RoutingLinter.lint(graph);
    const phantomHazard = diagnostics.find(d => d.code === 'WARN_PHANTOM_LINE');

    expect(phantomHazard).toBeDefined();
    expect(phantomHazard.severity).toBe('warning');
  });

  it('returns clean zero errors for an optimal 1:1 DAW return patch', () => {
    const input = new StageInputNode({ id: 'in-vox', channelIndex: 1, name: 'Lead Vox' });
    const usb = new USBSendMatrixNode({ id: 'usb-1', channelIndex: 1, tapPoint: 'Analog In' });
    const daw = new AbletonLiveNode({ id: 'daw-vox', trackType: 'live_vocal' });
    const strip = new ChannelStripNode({ id: 'strip-ch1', channelIndex: 1, rtnsw: true });
    const mainPA = new OutputBusNode({ id: 'out-pa', busType: 'main_lr' });

    graph.addNode(input);
    graph.addNode(usb);
    graph.addNode(daw);
    graph.addNode(strip);
    graph.addNode(mainPA);

    // in -> usb send -> daw in -> daw out -> strip usb in -> strip main out -> PA
    graph.connect({
      fromNodeId: 'in-vox',
      fromPortId: input.outputs[0].id,
      toNodeId: 'usb-1',
      toPortId: usb.inputs[0].id
    });
    graph.connect({
      fromNodeId: 'usb-1',
      fromPortId: usb.outputs[0].id,
      toNodeId: 'daw-vox',
      toPortId: daw.inputs[0].id
    });
    graph.connect({
      fromNodeId: 'daw-vox',
      fromPortId: daw.outputs[0].id,
      toNodeId: 'strip-ch1',
      toPortId: strip.inputs.find(p => p.name.includes('USB')).id
    });
    graph.connect({
      fromNodeId: 'strip-ch1',
      fromPortId: strip.outputs.find(p => p.name.includes('Main')).id,
      toNodeId: 'out-pa',
      toPortId: mainPA.inputs[0].id
    });

    const diagnostics = RoutingLinter.lint(graph);
    const errors = diagnostics.filter(d => d.severity === 'error');
    expect(errors.length).toBe(0);
  });
});
