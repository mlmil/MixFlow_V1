export class InteractionHandler {
  constructor({ renderer, graph }) {
    this.renderer = renderer;
    this.graph = graph;
    this.container = renderer.container;

    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    this.draggedNode = null;
    this.nodeOffset = { x: 0, y: 0 };

    this.pendingWire = null; // { fromNodeId, fromPortId, startX, startY }

    this.bindEvents();
  }

  bindEvents() {
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  onMouseDown(e) {
    const socket = e.target.closest('.port-socket');
    if (socket) {
      this.startWireDrag(socket, e);
      return;
    }

    const nodeHeader = e.target.closest('.node-header');
    if (nodeHeader) {
      const nodeEl = nodeHeader.closest('.graph-node');
      const nodeId = nodeEl.id.replace('dom_', '');
      this.startNodeDrag(nodeId, e);
      return;
    }

    // Otherwise pan canvas on background click (left, middle, or right)
    if (e.target === this.container || e.target.closest('.connections-layer') || e.target.classList.contains('nodes-layer')) {
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.renderer.panX, y: e.clientY - this.renderer.panY };
    }
  }

  startNodeDrag(nodeId, e) {
    const node = this.graph.getNode(nodeId);
    if (!node) return;

    this.draggedNode = node;
    const mouseCanvasX = (e.clientX - this.renderer.panX) / this.renderer.zoom;
    const mouseCanvasY = (e.clientY - this.renderer.panY) / this.renderer.zoom;
    this.nodeOffset = {
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y
    };

    // Bring selected node to front visually
    this.container.querySelectorAll('.graph-node').forEach(el => el.classList.remove('selected'));
    const domNode = this.renderer.nodeElements.get(nodeId);
    if (domNode) domNode.classList.add('selected');
  }

  startWireDrag(socket, e) {
    e.stopPropagation();
    const nodeId = socket.dataset.nodeId;
    const portId = socket.dataset.portId;
    const direction = socket.dataset.direction;

    const node = this.graph.getNode(nodeId);
    if (!node) return;
    const port = node.getPort(portId);
    if (!port) return;

    const pos = this.renderer.getPortCoordinates(nodeId, portId);
    this.pendingWire = {
      nodeId,
      portId,
      direction,
      port,
      startX: pos.x,
      startY: pos.y
    };
  }

  onMouseMove(e) {
    if (this.isPanning) {
      this.renderer.setPan(e.clientX - this.panStart.x, e.clientY - this.panStart.y);
      return;
    }

    if (this.draggedNode) {
      const mouseCanvasX = (e.clientX - this.renderer.panX) / this.renderer.zoom;
      const mouseCanvasY = (e.clientY - this.renderer.panY) / this.renderer.zoom;

      this.draggedNode.x = Math.round(mouseCanvasX - this.nodeOffset.x);
      this.draggedNode.y = Math.round(mouseCanvasY - this.nodeOffset.y);

      const domNode = this.renderer.nodeElements.get(this.draggedNode.id);
      if (domNode) {
        domNode.style.left = `${this.draggedNode.x}px`;
        domNode.style.top = `${this.draggedNode.y}px`;
      }
      this.renderer.renderConnections();
      return;
    }

    if (this.pendingWire) {
      const mouseCanvasX = (e.clientX - this.renderer.panX) / this.renderer.zoom;
      const mouseCanvasY = (e.clientY - this.renderer.panY) / this.renderer.zoom;

      if (this.pendingWire.direction === 'output') {
        this.renderer.drawPendingWire(
          this.pendingWire.startX, this.pendingWire.startY,
          mouseCanvasX, mouseCanvasY,
          this.pendingWire.port.color || 'var(--color-vocal)'
        );
      } else {
        this.renderer.drawPendingWire(
          mouseCanvasX, mouseCanvasY,
          this.pendingWire.startX, this.pendingWire.startY,
          this.pendingWire.port.color || 'var(--color-vocal)'
        );
      }
    }
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
    }

    if (this.draggedNode) {
      this.draggedNode = null;
    }

    if (this.pendingWire) {
      this.renderer.hidePendingWire();
      const targetSocket = e.target.closest('.port-socket');
      if (targetSocket) {
        const targetNodeId = targetSocket.dataset.nodeId;
        const targetPortId = targetSocket.dataset.portId;
        const targetDirection = targetSocket.dataset.direction;

        if (this.pendingWire.direction !== targetDirection && this.pendingWire.nodeId !== targetNodeId) {
          if (this.pendingWire.direction === 'output') {
            this.graph.connect({
              fromNodeId: this.pendingWire.nodeId,
              fromPortId: this.pendingWire.portId,
              toNodeId: targetNodeId,
              toPortId: targetPortId,
              color: this.pendingWire.port.color
            });
          } else {
            this.graph.connect({
              fromNodeId: targetNodeId,
              fromPortId: targetPortId,
              toNodeId: this.pendingWire.nodeId,
              toPortId: this.pendingWire.portId,
              color: this.pendingWire.port.color
            });
          }
        }
      }
      this.pendingWire = null;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    this.renderer.setZoom(this.renderer.zoom * zoomFactor, e.clientX, e.clientY);
  }
}
