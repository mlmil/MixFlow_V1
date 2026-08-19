export class CanvasRenderer {
  constructor({ container, graph }) {
    this.container = container;
    this.graph = graph;

    this.zoom = 1;
    this.panX = 100;
    this.panY = 100;

    this.viewportEl = null;
    this.svgLayer = null;
    this.nodesLayer = null;
    this.pendingWirePath = null;
    this.pendingWireSource = null;

    this.nodeElements = new Map(); // nodeId -> HTMLElement

    this.graph.renderer = this;
    this.initDOM();
    this.bindGraphEvents();
  }

  initDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('canvas-container');

    this.viewportEl = document.createElement('div');
    this.viewportEl.classList.add('canvas-viewport');

    // SVG layer for connection cables
    this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgLayer.classList.add('connections-layer');

    // Pending wire during drag
    this.pendingWirePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.pendingWirePath.classList.add('wire-path', 'wire-pending');
    this.pendingWirePath.style.display = 'none';
    this.svgLayer.appendChild(this.pendingWirePath);

    this.nodesLayer = document.createElement('div');
    this.nodesLayer.classList.add('nodes-layer');

    this.viewportEl.appendChild(this.svgLayer);
    this.viewportEl.appendChild(this.nodesLayer);
    this.container.appendChild(this.viewportEl);

    this.updateTransform();
  }

  bindGraphEvents() {
    this.graph.on('nodeAdded', node => this.renderNode(node));
    this.graph.on('nodeRemoved', node => this.removeNodeDOM(node.id));
    this.graph.on('connectionAdded', () => this.renderConnections());
    this.graph.on('connectionRemoved', () => this.renderConnections());
    this.graph.on('clear', () => this.clearDOM());
    this.graph.on('nodeChange', (data) => {
      if (data && data.node) {
        this.renderNode(data.node);
      }
      this.renderConnections();
    });
  }

  setZoom(zoom, centerX = window.innerWidth / 2, centerY = window.innerHeight / 2) {
    const prevZoom = this.zoom;
    this.zoom = Math.min(Math.max(zoom, 0.25), 2.5);

    // Zoom toward center point
    this.panX = centerX - (centerX - this.panX) * (this.zoom / prevZoom);
    this.panY = centerY - (centerY - this.panY) * (this.zoom / prevZoom);

    this.updateTransform();
    this.container.dispatchEvent(new CustomEvent('canvasTransform', { 
      detail: { zoom: this.zoom, panX: this.panX, panY: this.panY } 
    }));
  }

  setPan(panX, panY) {
    this.panX = panX;
    this.panY = panY;
    this.updateTransform();
    this.container.dispatchEvent(new CustomEvent('canvasTransform', { 
      detail: { zoom: this.zoom, panX: this.panX, panY: this.panY } 
    }));
  }

  updateTransform() {
    if (this.viewportEl) {
      this.viewportEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }
  }

  renderAll() {
    this.clearDOM();
    this.graph.nodes.forEach(node => this.renderNode(node));
    this.renderConnections();
  }

  clearDOM() {
    this.nodesLayer.innerHTML = '';
    this.nodeElements.clear();
    // clear connections
    const paths = this.svgLayer.querySelectorAll('.wire-rendered');
    paths.forEach(p => p.remove());
  }

  removeNodeDOM(nodeId) {
    const el = this.nodeElements.get(nodeId);
    if (el) {
      el.remove();
      this.nodeElements.delete(nodeId);
    }
    this.renderConnections();
  }

  renderNode(node) {
    if (this.nodeElements.has(node.id)) {
      this.nodeElements.get(node.id).remove();
    }

    const nodeEl = document.createElement('div');
    nodeEl.classList.add('graph-node');
    nodeEl.id = `dom_${node.id}`;
    nodeEl.style.left = `${node.x}px`;
    nodeEl.style.top = `${node.y}px`;

    if (node.hasError) nodeEl.classList.add('node-error');
    if (node.hasWarning) nodeEl.classList.add('node-warning');

    // Header
    const header = document.createElement('div');
    header.classList.add('node-header');
    header.innerHTML = `
      <div class="node-title-group">
        <div class="node-badge" style="background: ${this.getNodeColor(node.category)}"></div>
        <span class="node-title" title="Double click to rename">${node.title}</span>
      </div>
      <span class="node-category">${node.category}</span>
    `;

    const titleSpan = header.querySelector('.node-title');
    titleSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const newTitle = prompt('Edit Node Name:', node.title);
      if (newTitle && newTitle.trim()) {
        node.title = newTitle.trim();
        titleSpan.textContent = node.title;
        if (this.graph) this.graph.emit('change');
      }
    });

    // Body with custom controls & ports
    const body = document.createElement('div');
    body.classList.add('node-body');

    // Custom node UI if provided
    if (typeof node.renderCustomControls === 'function') {
      const controls = node.renderCustomControls();
      if (controls) body.appendChild(controls);
    }

    // Ports
    const portsContainer = document.createElement('div');
    portsContainer.classList.add('ports-container');

    const inCol = document.createElement('div');
    inCol.classList.add('ports-column', 'inputs');
    node.inputs.forEach(port => inCol.appendChild(this.createPortElement(port)));

    const outCol = document.createElement('div');
    outCol.classList.add('ports-column', 'outputs');
    node.outputs.forEach(port => outCol.appendChild(this.createPortElement(port)));

    portsContainer.appendChild(inCol);
    portsContainer.appendChild(outCol);
    body.appendChild(portsContainer);

    nodeEl.appendChild(header);
    nodeEl.appendChild(body);

    this.nodesLayer.appendChild(nodeEl);
    this.nodeElements.set(node.id, nodeEl);

    return nodeEl;
  }

  createPortElement(port) {
    const item = document.createElement('div');
    item.classList.add('port-item');

    const socket = document.createElement('div');
    socket.classList.add('port-socket');
    socket.dataset.nodeId = port.node.id;
    socket.dataset.portId = port.id;
    socket.dataset.direction = port.direction;

    if (port.color) {
      socket.style.borderColor = port.color;
    }
    if (port.isConnected) {
      socket.classList.add('connected');
      if (port.color) socket.style.backgroundColor = port.color;
    }

    const label = document.createElement('span');
    label.classList.add('port-label');
    label.textContent = port.name;

    if (port.direction === 'input') {
      item.appendChild(socket);
      item.appendChild(label);
    } else {
      item.appendChild(label);
      item.appendChild(socket);
    }

    return item;
  }

  getNodeColor(category) {
    switch (category) {
      case 'input': return 'var(--color-vocal)';
      case 'usb_send': return 'var(--color-keys)';
      case 'daw': return 'var(--color-playback)';
      case 'strip': return 'var(--color-guitar)';
      case 'bus': return 'var(--color-iem)';
      case 'main': return 'var(--color-main)';
      default: return 'var(--color-wire-default)';
    }
  }

  getPortCoordinates(nodeId, portId) {
    const node = this.graph.getNode(nodeId);
    if (!node) return null;

    const nodeEl = this.nodeElements.get(nodeId);
    if (!nodeEl) return null;

    const socket = nodeEl.querySelector(`[data-port-id="${portId}"]`);
    if (!socket) return null;

    const nodeRect = nodeEl.getBoundingClientRect();
    const socketRect = socket.getBoundingClientRect();

    // Calculate relative coordinate in canvas space
    const relX = (socketRect.left + socketRect.width / 2 - nodeRect.left) / this.zoom;
    const relY = (socketRect.top + socketRect.height / 2 - nodeRect.top) / this.zoom;

    return {
      x: node.x + relX,
      y: node.y + relY
    };
  }

  renderConnections() {
    // Remove existing wire paths (except pending)
    const existing = this.svgLayer.querySelectorAll('.wire-rendered');
    existing.forEach(p => p.remove());

    this.graph.connections.forEach(conn => {
      const fromPos = this.getPortCoordinates(conn.fromNodeId, conn.fromPortId);
      const toPos = this.getPortCoordinates(conn.toNodeId, conn.toPortId);

      if (!fromPos || !toPos) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('wire-path', 'wire-rendered', 'wire-active');
      path.dataset.connId = conn.id;

      const d = this.calculateBezier(fromPos.x, fromPos.y, toPos.x, toPos.y);
      path.setAttribute('d', d);
      path.style.stroke = conn.color || 'var(--color-vocal)';

      // Right-click or double-click to delete wire
      path.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.graph.disconnect(conn.id);
      });

      this.svgLayer.appendChild(path);
    });

    // Update socket connected states
    this.updateSocketStates();
  }

  updateSocketStates() {
    this.container.querySelectorAll('.port-socket').forEach(socket => {
      const nodeId = socket.dataset.nodeId;
      const portId = socket.dataset.portId;
      const node = this.graph.getNode(nodeId);
      if (!node) return;
      const port = node.getPort(portId);
      if (port && port.isConnected) {
        socket.classList.add('connected');
        if (port.color) socket.style.backgroundColor = port.color;
      } else {
        socket.classList.remove('connected');
        socket.style.backgroundColor = '';
      }
    });
  }

  calculateBezier(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.5;
    const curvature = Math.max(dx, 40);
    const cx1 = x1 + curvature;
    const cy1 = y1;
    const cx2 = x2 - curvature;
    const cy2 = y2;
    return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
  }

  drawPendingWire(x1, y1, x2, y2, color = 'var(--color-vocal)') {
    const d = this.calculateBezier(x1, y1, x2, y2);
    this.pendingWirePath.setAttribute('d', d);
    this.pendingWirePath.style.stroke = color;
    this.pendingWirePath.style.display = 'block';
  }

  hidePendingWire() {
    this.pendingWirePath.style.display = 'none';
  }
}
