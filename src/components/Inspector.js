import { ToneGenerator } from '../audio/ToneGenerator.js';

export class Inspector {
  constructor({ container, graph, toneGen }) {
    this.container = container;
    this.graph = graph;
    this.toneGen = toneGen || new ToneGenerator();
    this.selectedNodeId = null;
    this.isOpen = false;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.el = document.createElement('aside');
    this.el.classList.add('inspector-panel');

    this.el.innerHTML = `
      <div class="inspector-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--color-vocal); letter-spacing: 0.5px;">INSPECTOR</span>
          <span class="inspector-id mono" style="font-size: 10px; color: var(--text-muted);">No Selection</span>
        </div>
        <button class="inspector-close-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px;">✕</button>
      </div>

      <div class="inspector-body">
        <div class="inspector-empty" style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px;">
          <div style="font-size: 24px; margin-bottom: 8px;">🎛️</div>
          <strong>Select a Channel or Node</strong>
          <p style="margin-top: 4px; font-size: 11px;">Inspect gain staging, return switches, bus sends, tone generator preview, and linter auto-fixes here.</p>
        </div>
        <div class="inspector-content" style="display: none; padding: 14px; flex-direction: column; gap: 12px;"></div>
      </div>
    `;

    this.inspectorContent = this.el.querySelector('.inspector-content');
    this.inspectorEmpty = this.el.querySelector('.inspector-empty');
    this.inspectorId = this.el.querySelector('.inspector-id');

    this.el.querySelector('.inspector-close-btn').addEventListener('click', () => this.close());
    this.container.appendChild(this.el);
  }

  bindEvents() {
    this.graph.on('nodeChange', () => {
      if (this.selectedNodeId) this.renderSelection(this.selectedNodeId);
    });
    this.graph.on('diagnosticsUpdated', () => {
      if (this.selectedNodeId) this.renderSelection(this.selectedNodeId);
    });
  }

  select(nodeId) {
    this.selectedNodeId = nodeId;
    this.open();
    this.renderSelection(nodeId);
  }

  open() {
    this.isOpen = true;
    this.el.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove('open');
    this.selectedNodeId = null;
  }

  renderSelection(nodeId) {
    const node = this.graph.getNode(nodeId);
    if (!node) {
      this.inspectorEmpty.style.display = 'block';
      this.inspectorContent.style.display = 'none';
      this.inspectorId.textContent = 'No Selection';
      return;
    }

    this.inspectorEmpty.style.display = 'none';
    this.inspectorContent.style.display = 'flex';
    this.inspectorId.textContent = node.id;

    // Filter findings for this node
    const findings = node.diagnostics || [];

    this.inspectorContent.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${node.title}</h3>
        <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">CATEGORY: ${node.category}</span>
      </div>

      <!-- Live Controls Box -->
      <div class="inspector-controls-box" style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; display: flex; flex-direction: column; gap: 8px;">
        ${this.renderNodeSpecificInspectorControls(node)}
      </div>

      <!-- Tone Generator Preview Box -->
      <div class="tone-gen-box" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11px; font-weight: 600; color: var(--color-keys);">🔊 Test Tone / Preview</span>
          <button class="btn-tone-toggle tool-btn" style="font-size: 10px; padding: 3px 8px;">
            ${this.toneGen.isPlaying ? '⏹️ Stop Tone' : '▶️ Inject Tone'}
          </button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center; font-size: 10px;">
          <select class="tone-type-select node-select" style="width: 80px; padding: 2px;">
            <option value="sine" ${this.toneGen.type === 'sine' ? 'selected' : ''}>1kHz Sine</option>
            <option value="pink" ${this.toneGen.type === 'pink' ? 'selected' : ''}>Pink Noise</option>
            <option value="white" ${this.toneGen.type === 'white' ? 'selected' : ''}>White Noise</option>
          </select>
          <span style="font-family: var(--font-mono); color: var(--text-muted);">${this.toneGen.levelDb} dBFS</span>
        </div>
      </div>

      <!-- Active Diagnostics & 1-Click Fixes -->
      ${findings.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--status-error);">⚠️ ACTIVE FINDINGS (${findings.length})</span>
          ${findings.map((f, i) => `
            <div class="inspector-finding-card" style="background: rgba(255, 51, 102, 0.1); border: 1px solid var(--status-error); border-radius: var(--radius-sm); padding: 8px; font-size: 11px;">
              <strong style="color: var(--text-primary);">${f.code}</strong>
              <p style="color: var(--text-secondary); margin: 4px 0 6px 0; font-size: 10.5px;">${f.message}</p>
              ${f.fix ? `<button class="tool-btn primary btn-apply-fix" data-finding-idx="${i}" style="font-size: 10px; padding: 3px 8px;">⚡ ${f.fix.label} →</button>` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="background: rgba(0, 230, 118, 0.1); border: 1px solid var(--status-success); border-radius: var(--radius-sm); padding: 8px; font-size: 11px; color: var(--status-success);">
          ✓ Signal routing on this node is clean and validated.
        </div>
      `}
    `;

    // Bind Tone Generator Button
    const toneBtn = this.inspectorContent.querySelector('.btn-tone-toggle');
    const toneSelect = this.inspectorContent.querySelector('.tone-type-select');
    toneBtn.addEventListener('click', () => {
      if (this.toneGen.isPlaying) {
        this.toneGen.stop();
        toneBtn.textContent = '▶️ Inject Tone';
        toneBtn.classList.remove('primary');
      } else {
        const type = toneSelect.value;
        const freq = type === 'sine' ? 1000 : 440;
        this.toneGen.start(type, freq, -18);
        toneBtn.textContent = '⏹️ Stop Tone';
        toneBtn.classList.add('primary');
      }
    });

    toneSelect.addEventListener('change', (e) => {
      if (this.toneGen.isPlaying) {
        const type = e.target.value;
        const freq = type === 'sine' ? 1000 : 440;
        this.toneGen.start(type, freq, -18);
      }
    });

    // Bind 1-Click Auto-Fix Buttons
    this.inspectorContent.querySelectorAll('.btn-apply-fix').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.findingIdx, 10);
        const finding = findings[idx];
        if (finding && finding.fix && typeof finding.fix.apply === 'function') {
          finding.fix.apply(this.graph);
          if (this.graph.renderer) {
            this.graph.renderer.renderNode(node);
            this.graph.renderer.renderConnections();
          }
          this.renderSelection(node.id);
        }
      });
    });
  }

  renderNodeSpecificInspectorControls(node) {
    if (node.category === 'input') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Preamp Gain:</span>
          <span style="font-family: var(--font-mono); color: var(--color-vocal); font-weight:700;">${node.getProperty('gain')} dB</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>+48V Phantom:</span>
          <span style="font-family: var(--font-mono); color: ${node.getProperty('phantom') ? 'var(--status-error)' : 'var(--text-muted)'}; font-weight:700;">${node.getProperty('phantom') ? 'ON (ACTIVE)' : 'OFF'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Low-Cut HPF:</span>
          <span style="font-family: var(--font-mono);">${node.getProperty('hpf') ? `${node.getProperty('hpf')} Hz` : 'OFF'}</span>
        </div>
      `;
    }

    if (node.category === 'strip') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Input Source:</span>
          <span style="font-family: var(--font-mono); color: ${node.getProperty('rtnsw') ? 'var(--color-playback)' : 'var(--color-vocal)'}; font-weight:700;">${node.getProperty('rtnsw') ? 'USB DAW Return' : 'Analog XLR In'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Fader Level:</span>
          <span style="font-family: var(--font-mono); color: var(--text-primary); font-weight:700;">${node.getProperty('fader')} dB</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Stereo Link:</span>
          <span style="font-family: var(--font-mono);">${node.getProperty('isStereoPair') ? 'LINKED (STEREO)' : 'MONO'}</span>
        </div>
      `;
    }

    if (node.category === 'usb_send') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Tap Point:</span>
          <span style="font-family: var(--font-mono); color: var(--color-keys); font-weight:700;">${node.getProperty('tapPoint')}</span>
        </div>
      `;
    }

    if (node.category === 'daw') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Track Type:</span>
          <span style="font-family: var(--font-mono); color: var(--color-playback);">${node.getProperty('trackType')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Output Routing:</span>
          <span style="font-family: var(--font-mono); font-weight:700; color: var(--status-warning);">${node.getProperty('isStereoOut') ? `Ext. Out ${node.getProperty('outputChannel')}/${node.getProperty('outputChannel')+1}` : `Ext. Out ${node.getProperty('outputChannel')}`}</span>
        </div>
      `;
    }

    return `<span style="font-size: 11px; color: var(--text-muted);">${node.title} · ${node.category}</span>`;
  }
}
