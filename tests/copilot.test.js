import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../src/graph/Graph.js';
import { StageInputNode } from '../src/nodes/StageInputNode.js';
import { ChannelStripNode } from '../src/nodes/ChannelStripNode.js';
import { GraphContextSerializer } from '../src/copilot/GraphContextSerializer.js';
import { RoutingLinter } from '../src/linter/RoutingLinter.js';

describe('AI Routing Co-Pilot Context Serializer', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('serializes graph topology into compact prompt context', () => {
    const input = new StageInputNode({ id: 'in1', channelIndex: 1, name: 'Lead Vox', gain: 32, phantom: true });
    const strip = new ChannelStripNode({ id: 'strip1', channelIndex: 1, name: 'Lead Vox', rtnsw: true });

    graph.addNode(input);
    graph.addNode(strip);

    const diagnostics = RoutingLinter.lint(graph);
    const summary = GraphContextSerializer.summarize(graph, diagnostics);

    expect(summary.totalNodes).toBe(2);
    expect(summary.activeDiagnostics.length).toBeGreaterThan(0);
    expect(summary.channels[0].name).toBe('Lead Vox');
    expect(summary.channels[0].rtnsw).toBe(true);
  });
});
