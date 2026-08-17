export class Connection {
  constructor({ id, fromNodeId, fromPortId, toNodeId, toPortId, color = null }) {
    this.id = id || `conn_${Math.random().toString(36).substring(2, 9)}`;
    this.fromNodeId = fromNodeId;
    this.fromPortId = fromPortId;
    this.toNodeId = toNodeId;
    this.toPortId = toPortId;
    this.color = color;
  }

  toJSON() {
    return {
      id: this.id,
      fromNodeId: this.fromNodeId,
      fromPortId: this.fromPortId,
      toNodeId: this.toNodeId,
      toPortId: this.toPortId,
      color: this.color
    };
  }
}
