import { Node } from '../graph/Node.js';
import { Port } from '../graph/Port.js';

export class OutputBusNode extends Node {
  constructor(options = {}) {
    const busType = options.busType || 'main_lr'; // 'main_lr' | 'aux_iem'
    const auxIndex = options.auxIndex || 1;
    const name = options.name || (busType === 'main_lr' ? 'Main FOH PA' : `Aux ${auxIndex} IEM`);

    super({
      id: options.id,
      title: options.title || (busType === 'main_lr' ? `PA Master: ${name}` : `IEM Bus ${auxIndex}: ${name}`),
      category: busType === 'main_lr' ? 'main' : 'bus',
      x: options.x || 0,
      y: options.y || 0,
      properties: {
        busType,
        auxIndex,
        name,
        masterFader: options.masterFader !== undefined ? options.masterFader : 0,
        limiterOn: options.limiterOn !== undefined ? options.limiterOn : true
      }
    });

    if (busType === 'main_lr') {
      // Distinct Left & Right Master XLR Input Jacks
      this.addPort(new Port({
        id: `bus_in_l_${this.id}`,
        name: 'Main In [L] (XLR L)',
        direction: 'input',
        type: 'main',
        color: 'var(--color-main)'
      }));
      this.addPort(new Port({
        id: `bus_in_r_${this.id}`,
        name: 'Main In [R] (XLR R)',
        direction: 'input',
        type: 'main',
        color: 'var(--color-main)'
      }));
    } else {
      this.addPort(new Port({
        id: `bus_in_${this.id}`,
        name: `Aux ${auxIndex} Sum In`,
        direction: 'input',
        type: 'bus',
        color: 'var(--color-iem)'
      }));
    }
  }

  static fromJSON(data) {
    return new OutputBusNode({
      id: data.id,
      title: data.title,
      x: data.x,
      y: data.y,
      ...data.properties
    });
  }

  renderCustomControls() {
    const container = document.createElement('div');
    container.classList.add('bus-controls-container');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';

    const faderRow = document.createElement('div');
    faderRow.classList.add('node-control-row');
    faderRow.innerHTML = `
      <label>Master Out</label>
      <div style="display: flex; align-items: center; gap: 6px;">
        <input type="range" class="node-slider" min="-60" max="10" value="${this.getProperty('masterFader')}" style="width: 80px;" />
        <span class="fader-val" style="font-family: var(--font-mono); font-size: 10px; width: 40px; text-align: right;">${this.getProperty('masterFader')} dB</span>
      </div>
    `;

    const slider = faderRow.querySelector('input');
    const valSpan = faderRow.querySelector('.fader-val');
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valSpan.textContent = `${val} dB`;
      this.setProperty('masterFader', val);
    });

    container.appendChild(faderRow);
    return container;
  }
}
