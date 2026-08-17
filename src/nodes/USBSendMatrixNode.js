import { Node } from '../graph/Node.js';
import { Port } from '../graph/Port.js';

export const TAP_POINTS = [
  'Analog In',
  'Pre-EQ',
  'Post-EQ',
  'Pre-Fader',
  'Post-Fader'
];

export class USBSendMatrixNode extends Node {
  constructor(options = {}) {
    const channelIndex = options.channelIndex || 1;
    super({
      id: options.id,
      title: options.title || `USB Send ${channelIndex}`,
      category: 'usb_send',
      x: options.x || 0,
      y: options.y || 0,
      properties: {
        channelIndex,
        tapPoint: options.tapPoint || 'Analog In'
      }
    });

    this.addPort(new Port({
      id: `usb_in_source_${this.id}`,
      name: `Ch ${channelIndex} Source`,
      direction: 'input',
      type: 'audio'
    }));

    this.addPort(new Port({
      id: `usb_out_daw_${this.id}`,
      name: `USB ${channelIndex} Out (To DAW)`,
      direction: 'output',
      type: 'usb',
      color: 'var(--color-keys)'
    }));
  }

  static fromJSON(data) {
    return new USBSendMatrixNode({
      id: data.id,
      title: data.title,
      x: data.x,
      y: data.y,
      ...data.properties
    });
  }

  renderCustomControls() {
    const container = document.createElement('div');
    container.classList.add('node-control-row');

    const select = document.createElement('select');
    select.classList.add('node-select');
    TAP_POINTS.forEach(tp => {
      const opt = document.createElement('option');
      opt.value = tp;
      opt.textContent = tp;
      if (tp === this.getProperty('tapPoint')) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      this.setProperty('tapPoint', e.target.value);
    });

    const label = document.createElement('label');
    label.textContent = 'Tap Point';

    container.appendChild(label);
    container.appendChild(select);
    return container;
  }
}
