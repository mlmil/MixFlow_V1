import { Node } from './Node.js';
import { Connection } from './Connection.js';
import { Port } from './Port.js';

export class Graph {
  constructor() {
    this.nodes = new Map();
    this.connections = [];
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  addNode(node) {
    if (!(node instanceof Node)) {
      node = new Node(node);
    }
    node.graph = this;
    this.nodes.set(node.id, node);
    this.emit('nodeAdded', node);
    this.emit('change', this);
    return node;
  }

  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all connected wires
    const toRemove = this.connections.filter(
      c => c.fromNodeId === nodeId || c.toNodeId === nodeId
    );
    toRemove.forEach(c => this.disconnect(c.id));

    this.nodes.delete(nodeId);
    this.emit('nodeRemoved', node);
    this.emit('change', this);
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  connect({ fromNodeId, fromPortId, toNodeId, toPortId, color = null }) {
    const fromNode = this.nodes.get(fromNodeId);
    const toNode = this.nodes.get(toNodeId);
    if (!fromNode || !toNode) return null;

    const fromPort = fromNode.getPort(fromPortId);
    const toPort = toNode.getPort(toPortId);
    if (!fromPort || !toPort) return null;

    // Validate directions: only output -> input
    if (fromPort.direction !== 'output' || toPort.direction !== 'input') {
      return null;
    }

    // Check duplicate
    const exists = this.connections.some(
      c => c.fromNodeId === fromNodeId && c.fromPortId === fromPortId &&
           c.toNodeId === toNodeId && c.toPortId === toPortId
    );
    if (exists) return null;

    const connection = new Connection({
      fromNodeId,
      fromPortId,
      toNodeId,
      toPortId,
      color: color || fromPort.color || '#00e5ff'
    });

    fromPort.connections.add(connection);
    toPort.connections.add(connection);
    this.connections.push(connection);

    this.emit('connectionAdded', connection);
    this.emit('change', this);
    return connection;
  }

  disconnect(connectionId) {
    const idx = this.connections.findIndex(c => c.id === connectionId);
    if (idx === -1) return;

    const conn = this.connections[idx];
    const fromNode = this.nodes.get(conn.fromNodeId);
    const toNode = this.nodes.get(conn.toNodeId);

    if (fromNode) {
      const p = fromNode.getPort(conn.fromPortId);
      if (p) p.connections.delete(conn);
    }
    if (toNode) {
      const p = toNode.getPort(conn.toPortId);
      if (p) p.connections.delete(conn);
    }

    this.connections.splice(idx, 1);
    this.emit('connectionRemoved', conn);
    this.emit('change', this);
  }

  clear() {
    this.connections = [];
    this.nodes.clear();
    this.emit('clear');
    this.emit('change', this);
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
      connections: this.connections.map(c => c.toJSON())
    };
  }

  static fromJSON(data, nodeRegistry = null) {
    const graph = new Graph();
    if (!data) return graph;

    if (Array.isArray(data.nodes)) {
      data.nodes.forEach(nodeData => {
        let node;
        if (nodeRegistry && nodeRegistry[nodeData.category]) {
          node = nodeRegistry[nodeData.category].fromJSON(nodeData);
        } else {
          node = Node.fromJSON(nodeData);
        }
        graph.addNode(node);
      });
    }

    if (Array.isArray(data.connections)) {
      data.connections.forEach(connData => {
        graph.connect(connData);
      });
    }

    return graph;
  }
}
