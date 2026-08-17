import { Node } from '../graph/Node.js';
import { Port } from '../graph/Port.js';

export class AbletonLiveNode extends Node {
  constructor(options = {}) {
    const trackName = options.trackName || 'Ableton Track';
    const trackType = options.trackType || 'live_vocal';
    const plugins = options.plugins || ['Autotune / Pitch', 'Compressor', 'Verb'];
    const isStereoOut = options.isStereoOut !== undefined ? options.isStereoOut : false;
    const outputChannel = options.outputChannel || 1;

    super({
      id: options.id,
      title: options.title || `Ableton: ${trackName}`,
      category: 'daw',
      x: options.x || 0,
      y: options.y || 0,
      properties: {
        trackName,
        trackType,
        plugins,
        outputChannel,
        isStereoOut,
        latencyMs: options.latencyMs || 2.8,
        isMuted: options.isMuted || false
      }
    });

    this.rebuildPorts();
  }

  rebuildPorts() {
    this.ports.clear();
    const outputChannel = this.getProperty('outputChannel', 1);
    const isStereoOut = this.getProperty('isStereoOut', false);

    // Ableton standard routing label: "Ext. In [channel]"
    this.addPort(new Port({
      id: `daw_in_${this.id}`,
      name: `Ext. In ${outputChannel}`,
      direction: 'input',
      type: 'usb'
    }));

    // Ableton standard routing label: "Ext. Out [channel]" or grouped stereo "Ext. Out [ch/ch+1]"
    if (isStereoOut) {
      this.addPort(new Port({
        id: `daw_out_stereo_${this.id}`,
        name: `Ext. Out ${outputChannel}/${outputChannel + 1}`,
        direction: 'output',
        type: 'usb',
        color: 'var(--color-playback)'
      }));
    } else {
      this.addPort(new Port({
        id: `daw_out_${this.id}`,
        name: `Ext. Out ${outputChannel}`,
        direction: 'output',
        type: 'usb',
        color: 'var(--color-playback)'
      }));
    }
  }

  toggleStereo() {
    const next = !this.getProperty('isStereoOut');
    this.setProperty('isStereoOut', next);
    this.rebuildPorts();
    if (this.graph) {
      this.graph.emit('nodeChange', { node: this, key: 'isStereoOut', value: next });
    }
  }

  static fromJSON(data) {
    return new AbletonLiveNode({
      id: data.id,
      title: data.title,
      x: data.x,
      y: data.y,
      ...data.properties
    });
  }

  renderCustomControls() {
    const container = document.createElement('div');
    container.classList.add('daw-rack-container');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';

    const pluginList = document.createElement('div');
    pluginList.style.background = 'var(--bg-input)';
    pluginList.style.padding = '6px 8px';
    pluginList.style.borderRadius = 'var(--radius-sm)';
    pluginList.style.fontSize = '10px';
    pluginList.style.fontFamily = 'var(--font-mono)';
    pluginList.style.color = 'var(--color-playback)';

    const plugins = this.getProperty('plugins', []);
    const outCh = this.getProperty('outputChannel', 1);
    const isStereo = this.getProperty('isStereoOut');
    const stereoTag = isStereo ? ` <span style="color:var(--status-warning); font-weight:700;">[Ext. Out ${outCh}/${outCh+1} Stereo]</span>` : ` <span style="color:var(--text-muted);">[Ext. Out ${outCh} Mono]</span>`;
    pluginList.innerHTML = `<strong>Audio To: Ext. Out</strong>${stereoTag}<br>${plugins.join(' ➔ ')}`;

    // Mode Toggle Bar (Mono vs Stereo Pair)
    const modeRow = document.createElement('div');
    modeRow.classList.add('node-control-row');
    modeRow.innerHTML = `
      <label style="font-size: 10px;">Output Mode:</label>
      <button class="node-btn btn-stereo-toggle" style="font-size: 10px; padding: 2px 8px; border-radius: 4px; background: ${isStereo ? 'rgba(213, 0, 249, 0.2)' : 'var(--bg-input)'}; border: 1px solid ${isStereo ? 'var(--color-playback)' : 'var(--border-subtle)'}; color: ${isStereo ? 'var(--color-playback)' : 'var(--text-secondary)'}; cursor: pointer;">
        ${isStereo ? '✨ Stereo (2-Ch)' : '🔘 Mono (1-Ch)'}
      </button>
    `;

    const toggleBtn = modeRow.querySelector('.btn-stereo-toggle');
    toggleBtn.addEventListener('click', () => {
      this.toggleStereo();
      if (this.graph && this.graph.renderer) {
        this.graph.renderer.renderNode(this);
        this.graph.renderer.renderConnections();
      }
    });

    const latencyRow = document.createElement('div');
    latencyRow.classList.add('node-control-row');
    latencyRow.innerHTML = `
      <span style="font-size: 10px; color: var(--text-muted);">Est. Buffer Latency:</span>
      <span style="font-size: 10px; font-family: var(--font-mono); color: var(--status-success);">${this.getProperty('latencyMs')} ms (64 smp @ 48k)</span>
    `;

    container.appendChild(pluginList);
    container.appendChild(modeRow);
    container.appendChild(latencyRow);
    return container;
  }
}
