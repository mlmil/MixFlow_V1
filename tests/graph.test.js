import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../src/graph/Graph.js';
import { Node } from '../src/graph/Node.js';
import { Port } from '../src/graph/Port.js';
import { Connection } from '../src/graph/Connection.js';

describe('Graph Data Model', () => {
  let graph;

  beforeEach(() => {
    graph = new Graph();
  });

  it('adds and retrieves nodes', () => {
    const node1 = new Node({ id: 'node-1', title: 'Input Preamp', category: 'input' });
    graph.addNode(node1);
    expect(graph.getNode('node-1')).toBe(node1);
    expect(graph.nodes.size).toBe(1);
  });

  it('adds ports to a node and maintains direction', () => {
    const node = new Node({ id: 'node-1', title: 'Channel 1' });
    const inPort = new Port({ id: 'in-1', name: 'In', type: 'audio', direction: 'input' });
    const outPort = new Port({ id: 'out-1', name: 'Out', type: 'audio', direction: 'output' });

    node.addPort(inPort);
    node.addPort(outPort);

    expect(node.inputs.length).toBe(1);
    expect(node.outputs.length).toBe(1);
    expect(node.getPort('in-1')).toBe(inPort);
  });

  it('creates connections between output and input ports', () => {
    const n1 = new Node({ id: 'n1', title: 'Source' });
    const outPort = new Port({ id: 'p_out', name: 'Out', direction: 'output' });
    n1.addPort(outPort);

    const n2 = new Node({ id: 'n2', title: 'Target' });
    const inPort = new Port({ id: 'p_in', name: 'In', direction: 'input' });
    n2.addPort(inPort);

    graph.addNode(n1);
    graph.addNode(n2);

    const conn = graph.connect({
      fromNodeId: 'n1',
      fromPortId: 'p_out',
      toNodeId: 'n2',
      toPortId: 'p_in'
    });

    expect(conn).not.toBeNull();
    expect(graph.connections.length).toBe(1);
    expect(outPort.isConnected).toBe(true);
    expect(inPort.isConnected).toBe(true);
  });

  it('rejects connection between incompatible directions (input to input)', () => {
    const n1 = new Node({ id: 'n1' });
    const in1 = new Port({ id: 'in1', direction: 'input' });
    n1.addPort(in1);

    const n2 = new Node({ id: 'n2' });
    const in2 = new Port({ id: 'in2', direction: 'input' });
    n2.addPort(in2);

    graph.addNode(n1);
    graph.addNode(n2);

    const conn = graph.connect({
      fromNodeId: 'n1',
      fromPortId: 'in1',
      toNodeId: 'n2',
      toPortId: 'in2'
    });

    expect(conn).toBeNull();
    expect(graph.connections.length).toBe(0);
  });

  it('serializes and deserializes the entire graph faithfully', () => {
    const n1 = new Node({ id: 'n1', title: 'Mic 1', x: 100, y: 150 });
    const outPort = new Port({ id: 'out1', name: 'XLR Out', direction: 'output' });
    n1.addPort(outPort);

    const n2 = new Node({ id: 'n2', title: 'USB 1', x: 400, y: 150 });
    const inPort = new Port({ id: 'in1', name: 'USB In', direction: 'input' });
    n2.addPort(inPort);

    graph.addNode(n1);
    graph.addNode(n2);
    graph.connect({ fromNodeId: 'n1', fromPortId: 'out1', toNodeId: 'n2', toPortId: 'in1' });

    const json = graph.toJSON();
    expect(json.nodes.length).toBe(2);
    expect(json.connections.length).toBe(1);

    const restoredGraph = Graph.fromJSON(json);
    expect(restoredGraph.nodes.size).toBe(2);
    expect(restoredGraph.connections.length).toBe(1);
    expect(restoredGraph.getNode('n1').x).toBe(100);
  });
});
