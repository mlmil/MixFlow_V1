import { Node } from '../graph/Node.js';
import { Port } from '../graph/Port.js';

export class ChannelStripNode extends Node {
  constructor(options = {}) {
    const channelIndex = options.channelIndex || 1;
    const name = options.name || `Ch ${channelIndex}`;
    const isStereoPair = options.isStereoPair !== undefined ? options.isStereoPair : false;

    super({
      id: options.id,
      title: options.title || (isStereoPair ? `Strip ${channelIndex}/${channelIndex+1} [Stereo]: ${name}` : `Strip ${channelIndex}: ${name}`),
      category: 'strip',
      x: options.x || 0,
      y: options.y || 0,
      properties: {
        channelIndex,
        name,
        isStereoPair,
        pan: options.pan !== undefined ? options.pan : 0,
        rtnsw: options.rtnsw !== undefined ? options.rtnsw : false,
        fader: options.fader !== undefined ? options.fader : 0,
        muted: options.muted !== undefined ? options.muted : false,
        lrAssign: options.lrAssign !== undefined ? options.lrAssign : true,
        auxSends: options.auxSends || [0, 0, 0, 0, 0, 0]
      }
    });

    this.rebuildPorts();
  }

  rebuildPorts() {
    this.ports.clear();
    const channelIndex = this.getProperty('channelIndex', 1);
    const isStereoPair = this.getProperty('isStereoPair', false);

    if (isStereoPair) {
      this.title = `Strip ${channelIndex}/${channelIndex+1} [Stereo]: ${this.getProperty('name')}`;
      this.addPort(new Port({
        id: `strip_usb_in_stereo_${this.id}`,
        name: `USB Return ${channelIndex}/${channelIndex+1}`,
        direction: 'input',
        type: 'usb'
      }));
    } else {
      this.title = `Strip ${channelIndex}: ${this.getProperty('name')}`;
      this.addPort(new Port({
        id: `strip_analog_in_${this.id}`,
        name: 'Analog In',
        direction: 'input',
        type: 'audio'
      }));
      this.addPort(new Port({
        id: `strip_usb_in_${this.id}`,
        name: `USB Return ${channelIndex}`,
        direction: 'input',
        type: 'usb'
      }));
    }

    // Outputs: Main LR Out & Aux IEM Bus Sends
    this.addPort(new Port({
      id: `strip_main_out_${this.id}`,
      name: isStereoPair ? 'Main PA Out (Stereo L/R)' : 'Main LR Out',
      direction: 'output',
      type: 'main',
      color: 'var(--color-main)'
    }));

    this.addPort(new Port({
      id: `strip_aux_out_${this.id}`,
      name: 'Aux IEM Sends (1-6)',
      direction: 'output',
      type: 'bus',
      color: 'var(--color-iem)'
    }));
  }

  toggleStereoLink() {
    const next = !this.getProperty('isStereoPair');
    this.setProperty('isStereoPair', next);
    this.rebuildPorts();
    if (this.graph) {
      this.graph.emit('nodeChange', { node: this, key: 'isStereoPair', value: next });
    }
  }

  static fromJSON(data) {
    return new ChannelStripNode({
      id: data.id,
      title: data.title,
      x: data.x,
      y: data.y,
      ...data.properties
    });
  }

  renderCustomControls() {
    const container = document.createElement('div');
    container.classList.add('strip-controls-container');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';

    const isUSB = this.getProperty('rtnsw');
    const isStereo = this.getProperty('isStereoPair');

    // rtnsw switch row
    const switchRow = document.createElement('div');
    switchRow.classList.add('node-control-row');

    switchRow.innerHTML = `
      <label style="font-weight: 600;">Input Source:</label>
      <div class="switch-toggle ${isUSB ? 'active' : ''}">
        <span style="font-size: 10px; color: ${!isUSB ? 'var(--color-vocal)' : 'var(--text-muted)'}">Analog</span>
        <div class="switch-box"><div class="switch-knob"></div></div>
        <span style="font-size: 10px; color: ${isUSB ? 'var(--color-playback)' : 'var(--text-muted)'}">USB Ret</span>
      </div>
    `;

    const toggle = switchRow.querySelector('.switch-toggle');
    toggle.addEventListener('click', () => {
      const cur = this.getProperty('rtnsw');
      this.setProperty('rtnsw', !cur);
      toggle.classList.toggle('active', !cur);
      const spans = toggle.querySelectorAll('span');
      spans[0].style.color = cur ? 'var(--color-vocal)' : 'var(--text-muted)';
      spans[1].style.color = !cur ? 'var(--color-playback)' : 'var(--text-muted)';
    });

    // Stereo Link Toggle Row
    const linkRow = document.createElement('div');
    linkRow.classList.add('node-control-row');
    linkRow.innerHTML = `
      <label style="font-size: 10px;">Channel Link:</label>
      <button class="node-btn btn-link-toggle" style="font-size: 10px; padding: 2px 8px; border-radius: 4px; background: ${isStereo ? 'rgba(0, 229, 255, 0.2)' : 'var(--bg-input)'}; border: 1px solid ${isStereo ? 'var(--color-vocal)' : 'var(--border-subtle)'}; color: ${isStereo ? 'var(--color-vocal)' : 'var(--text-secondary)'}; cursor: pointer;">
        ${isStereo ? '🔗 Stereo Linked' : '🔓 Mono Channel'}
      </button>
    `;

    const linkBtn = linkRow.querySelector('.btn-link-toggle');
    linkBtn.addEventListener('click', () => {
      this.toggleStereoLink();
      if (this.graph && this.graph.renderer) {
        this.graph.renderer.renderNode(this);
        this.graph.renderer.renderConnections();
      }
    });

    // Fader and Mute row
    const faderRow = document.createElement('div');
    faderRow.classList.add('node-control-row');
    const panDisplay = isStereo ? '<span style="font-size:10px; color:var(--color-playback); font-weight:700;">STEREO L/R</span>' : '';

    faderRow.innerHTML = `
      <label>Fader ${panDisplay}</label>
      <div style="display: flex; align-items: center; gap: 6px;">
        <input type="range" class="node-slider" min="-60" max="10" value="${this.getProperty('fader')}" style="width: 70px;" />
        <span class="fader-val" style="font-family: var(--font-mono); font-size: 10px; width: 40px; text-align: right;">${this.getProperty('fader')} dB</span>
        <button class="mute-btn ${this.getProperty('muted') ? 'active' : ''}" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-primary); cursor: pointer;">MUTE</button>
      </div>
    `;

    const faderSlider = faderRow.querySelector('input');
    const faderVal = faderRow.querySelector('.fader-val');
    faderSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      faderVal.textContent = `${val} dB`;
      this.setProperty('fader', val);
    });

    const muteBtn = faderRow.querySelector('.mute-btn');
    muteBtn.addEventListener('click', () => {
      const cur = this.getProperty('muted');
      this.setProperty('muted', !cur);
      muteBtn.classList.toggle('active', !cur);
      muteBtn.style.background = !cur ? 'var(--status-error)' : 'var(--bg-input)';
    });

    container.appendChild(switchRow);
    container.appendChild(linkRow);
    container.appendChild(faderRow);
    return container;
  }
}
