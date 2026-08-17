import { Node } from '../graph/Node.js';
import { Port } from '../graph/Port.js';

export class StageInputNode extends Node {
  constructor(options = {}) {
    const channelIndex = options.channelIndex || 1;
    const name = options.name || (channelIndex <= 16 ? `XLR In ${channelIndex}` : `Aux In ${channelIndex}`);
    
    super({
      id: options.id,
      title: options.title || `Input ${channelIndex}: ${name}`,
      category: 'input',
      x: options.x || 0,
      y: options.y || 0,
      properties: {
        channelIndex,
        name,
        gain: options.gain !== undefined ? options.gain : 24, // -12dB to +60dB
        phantom: options.phantom !== undefined ? options.phantom : false,
        invert: options.invert !== undefined ? options.invert : false,
        hpf: options.hpf !== undefined ? options.hpf : 0, // 0 = off, 20-400Hz
        isLineLevel: options.isLineLevel || (channelIndex >= 17)
      }
    });

    const portColor = this.getSignalColor(name);

    // Primary preamp output (to USB send or channel strip)
    this.addPort(new Port({
      id: `preamp_out_${this.id}`,
      name: 'Preamp Out (DAW / USB)',
      direction: 'output',
      type: 'audio',
      color: portColor
    }));

    // Zero-latency direct analog IEM tap (pre-DAW)
    this.addPort(new Port({
      id: `preamp_direct_iem_${this.id}`,
      name: 'Direct IEM Tap (0ms Analog)',
      direction: 'output',
      type: 'bus',
      color: 'var(--color-iem)'
    }));
  }

  static fromJSON(data) {
    return new StageInputNode({
      id: data.id,
      title: data.title,
      x: data.x,
      y: data.y,
      ...data.properties
    });
  }

  getSignalColor(name) {
    const n = name.toLowerCase();
    if (n.includes('vox') || n.includes('vocal') || n.includes('mic')) return 'var(--color-vocal)';
    if (n.includes('gtr') || n.includes('guitar') || n.includes('bass')) return 'var(--color-guitar)';
    if (n.includes('key') || n.includes('synth') || n.includes('piano')) return 'var(--color-keys)';
    if (n.includes('track') || n.includes('click') || n.includes('playback')) return 'var(--color-playback)';
    return 'var(--color-wire-default)';
  }

  renderCustomControls() {
    const container = document.createElement('div');
    container.classList.add('node-controls-group');

    const gainRow = document.createElement('div');
    gainRow.classList.add('node-control-row');
    gainRow.innerHTML = `
      <label>Gain</label>
      <div style="display: flex; align-items: center; gap: 6px;">
        <input type="range" class="node-slider" min="-12" max="60" value="${this.getProperty('gain')}" style="width: 80px;" />
        <span class="gain-val" style="font-family: var(--font-mono); font-size: 11px; width: 42px; text-align: right;">${this.getProperty('gain')} dB</span>
      </div>
    `;

    const gainSlider = gainRow.querySelector('input');
    const gainVal = gainRow.querySelector('.gain-val');
    gainSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      gainVal.textContent = `${val} dB`;
      this.setProperty('gain', val);
    });

    const btnRow = document.createElement('div');
    btnRow.classList.add('node-control-row');
    btnRow.style.marginTop = '6px';
    btnRow.innerHTML = `
      <button class="phantom-btn ${this.getProperty('phantom') ? 'active' : ''}">+48V</button>
      <button class="node-btn ${this.getProperty('invert') ? 'active' : ''}" style="font-size: 10px; padding: 2px 6px;">Ø Invert</button>
      <button class="node-btn ${this.getProperty('hpf') > 0 ? 'active' : ''}" style="font-size: 10px; padding: 2px 6px;">HPF ${this.getProperty('hpf') || 'Off'}</button>
    `;

    const phantomBtn = btnRow.querySelector('.phantom-btn');
    phantomBtn.addEventListener('click', () => {
      const cur = this.getProperty('phantom');
      this.setProperty('phantom', !cur);
      phantomBtn.classList.toggle('active', !cur);
    });

    container.appendChild(gainRow);
    container.appendChild(btnRow);
    return container;
  }
}
