import { Port } from './Port.js';

export class Node {
  constructor({ id, title = 'Node', category = 'generic', x = 0, y = 0, properties = {} }) {
    this.id = id || `node_${Math.random().toString(36).substring(2, 9)}`;
    this.title = title;
    this.category = category;
    this.x = x;
    this.y = y;
    this.properties = { ...properties };
    this.ports = new Map();
    this.graph = null;
    this.hasError = false;
    this.hasWarning = false;
    this.diagnostics = [];
  }

  addPort(port) {
    if (!(port instanceof Port)) {
      port = new Port(port);
    }
    port.node = this;
    this.ports.set(port.id, port);
    return port;
  }

  getPort(id) {
    return this.ports.get(id);
  }

  get inputs() {
    return Array.from(this.ports.values()).filter(p => p.direction === 'input');
  }

  get outputs() {
    return Array.from(this.ports.values()).filter(p => p.direction === 'output');
  }

  setProperty(key, value) {
    this.properties[key] = value;
    if (this.graph) {
      this.graph.emit('nodeChange', { node: this, key, value });
    }
  }

  getProperty(key, defaultValue = null) {
    return this.properties[key] !== undefined ? this.properties[key] : defaultValue;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      category: this.category,
      x: this.x,
      y: this.y,
      properties: this.properties,
      ports: Array.from(this.ports.values()).map(p => p.toJSON())
    };
  }

  static fromJSON(data) {
    const node = new Node({
      id: data.id,
      title: data.title,
      category: data.category,
      x: data.x,
      y: data.y,
      properties: data.properties
    });
    if (Array.isArray(data.ports)) {
      data.ports.forEach(p => node.addPort(new Port(p)));
    }
    return node;
  }
}
