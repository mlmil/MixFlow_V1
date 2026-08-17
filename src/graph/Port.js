export class Port {
  constructor({ id, name = '', direction = 'input', type = 'audio', color = null }) {
    this.id = id || `port_${Math.random().toString(36).substring(2, 9)}`;
    this.name = name;
    this.direction = direction; // 'input' | 'output'
    this.type = type; // 'audio' | 'usb' | 'bus' | 'main'
    this.color = color;
    this.node = null;
    this.connections = new Set();
  }

  get isConnected() {
    return this.connections.size > 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      direction: this.direction,
      type: this.type,
      color: this.color
    };
  }
}
