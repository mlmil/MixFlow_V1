import { ToneGenerator } from '../audio/ToneGenerator.js';

export class Inspector {
  constructor({ containerId, graph }) {
    this.container = document.getElementById(containerId);
    this.graph = graph;
    this.selectedNodeId = null;
    this.isOpen = false;
    this.toneGen = new ToneGenerator();

    this.initDOM();
  }

  initDOM() {
    this.panel = document.createElement('div');
    this.panel.classList.add('inspector-drawer');
    this.panel.innerHTML = `
      <div class="inspector-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="inspector-badge">INSPECTOR</span>
          <span id="inspector-node-id" class="inspector-node-id">No Selection</span>
        </div>
        <button id="btn-inspector-close" class="inspector-close-btn" title="Close Drawer">&times;</button>
      </div>

      <div id="inspector-body" class="inspector-body">
        <div id="inspector-empty" class="inspector-empty-state">
          <p>Select any node on the canvas to inspect real-time channel parameters, step-by-step Mixing Station guide, signal path story, and tone generator.</p>
        </div>

        <div id="inspector-content" class="inspector-content" style="display: none;">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    document.body.appendChild(this.panel);

    this.inspectorEmpty = this.panel.querySelector('#inspector-empty');
    this.inspectorContent = this.panel.querySelector('#inspector-content');
    this.inspectorId = this.panel.querySelector('#inspector-node-id');

    // Close button
    this.panel.querySelector('#btn-inspector-close').addEventListener('click', () => {
      this.close();
    });

    // Re-render when graph changes
    this.graph.on('change', () => {
      if (this.selectedNodeId) {
        this.renderSelection(this.selectedNodeId);
      }
    });
  }

  open() {
    this.isOpen = true;
    this.panel.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.panel.classList.remove('open');
    if (this.meterAnimFrame) cancelAnimationFrame(this.meterAnimFrame);
  }

  startMeterLoop() {
    if (this.meterAnimFrame) cancelAnimationFrame(this.meterAnimFrame);

    const updateMeter = () => {
      if (!this.toneGen || !this.toneGen.isPlaying) {
        this.resetMeterUI();
        return;
      }

      const meterData = this.toneGen.getMeterLevel();
      const readout = this.inspectorContent?.querySelector('.meter-db-readout');
      if (readout) {
        readout.textContent = `${meterData.peakDb > -60 ? meterData.peakDb.toFixed(1) : '-inf'} dBFS`;
      }

      const leds = this.inspectorContent?.querySelectorAll('.vu-led');
      if (leds && leds.length > 0) {
        const colors = [
          '#00e676', '#00e676', '#00e676', '#00e676', '#00e676', '#00e676',
          '#ffd600', '#ffd600',
          '#ff3d00', '#ff1744'
        ];
        const dimColors = [
          '#13331c', '#13331c', '#13331c', '#13331c', '#13331c', '#13331c',
          '#332c13', '#332c13',
          '#331813', '#331313'
        ];

        leds.forEach((led, i) => {
          const isActive = i < meterData.activeLeds;
          led.style.background = isActive ? colors[i] : dimColors[i];
          led.style.boxShadow = isActive ? `0 0 6px ${colors[i]}` : 'none';
        });
      }

      this.meterAnimFrame = requestAnimationFrame(updateMeter);
    };

    this.meterAnimFrame = requestAnimationFrame(updateMeter);
  }

  resetMeterUI() {
    if (this.meterAnimFrame) cancelAnimationFrame(this.meterAnimFrame);
    const readout = this.inspectorContent?.querySelector('.meter-db-readout');
    if (readout) readout.textContent = 'INACTIVE';

    const leds = this.inspectorContent?.querySelectorAll('.vu-led');
    if (leds) {
      const dimColors = [
        '#13331c', '#13331c', '#13331c', '#13331c', '#13331c', '#13331c',
        '#332c13', '#332c13',
        '#331813', '#331313'
      ];
      leds.forEach((led, i) => {
        led.style.background = dimColors[i];
        led.style.boxShadow = 'none';
      });
    }
  }

  select(nodeId) {
    this.selectedNodeId = nodeId;
    this.renderSelection(nodeId);
    this.open();
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
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${node.title}</h3>
        <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase;">CATEGORY: ${node.category}</span>
      </div>

      <!-- Signal Path Summary (Natural Language) -->
      <div class="signal-path-box" style="background: rgba(0, 229, 255, 0.07); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 12px; font-weight: 800; color: var(--color-vocal); text-transform: uppercase; letter-spacing: 0.5px;">🛣️ Signal Path Story</span>
        <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-secondary);">
          ${this.generateSignalPathStory(node)}
        </div>
      </div>

      <!-- Mixing Station & Ableton Step-by-Step Setup Guide -->
      <div class="ms-guide-box" style="background: rgba(255, 170, 0, 0.07); border: 1px solid rgba(255, 170, 0, 0.3); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 8px;">
        <span style="font-size: 12px; font-weight: 800; color: var(--color-guitar); text-transform: uppercase; letter-spacing: 0.5px;">🎛️ Mixing Station & XR18 Setup Instructions</span>
        <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-primary);">
          ${this.generateMixingStationInstructions(node)}
        </div>
      </div>

      <!-- Live Controls Box -->
      <div class="inspector-controls-box" style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <span style="font-size: 12px; font-weight: 800; color: var(--text-primary); text-transform: uppercase;">Node Parameters</span>
        ${this.renderNodeSpecificInspectorControls(node)}
        <div style="display:flex; justify-content:flex-end; margin-top:6px;">
          <button class="tool-btn btn-clear-node-wires" style="font-size:11px; padding:4px 10px; color:var(--status-error);" title="Disconnect all cables attached to this node">✂️ Clear Node Wires</button>
        </div>
      </div>

      <!-- Tone Generator & Live Signal Level Meter Box -->
      <div class="tone-gen-box" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 12px; font-weight: 700; color: var(--color-keys);">🔊 Test Tone / Signal Injector</span>
          <button class="btn-tone-toggle tool-btn" style="font-size: 11px; padding: 4px 10px;">
            ${this.toneGen.isPlaying ? '⏹️ Stop Tone' : '▶️ Inject Tone'}
          </button>
        </div>
        
        <div style="display: flex; gap: 8px; align-items: center; font-size: 12px;">
          <select class="tone-type-select node-select" style="width: 110px; padding: 4px;">
            <option value="sine" ${this.toneGen.type === 'sine' ? 'selected' : ''}>1kHz Sine</option>
            <option value="pink" ${this.toneGen.type === 'pink' ? 'selected' : ''}>Pink Noise</option>
            <option value="white" ${this.toneGen.type === 'white' ? 'selected' : ''}>White Noise</option>
          </select>
          <span style="font-family: var(--font-mono); color: var(--text-muted);">${this.toneGen.levelDb} dBFS Calibration</span>
        </div>

        <!-- Real-Time Hardware LED VU Level Meter -->
        <div class="vu-meter-container" style="display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 8px 10px; border: 1px solid var(--border-subtle); margin-top: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">
            <span>LIVE SIGNAL LEVEL</span>
            <span class="meter-db-readout" style="color: var(--color-keys); font-weight: 700;">${this.toneGen.isPlaying ? `${this.toneGen.levelDb} dBFS` : 'INACTIVE'}</span>
          </div>
          <div class="vu-led-ladder" style="display: flex; gap: 3px; height: 12px; align-items: center;">
            <div class="vu-led" data-idx="0" style="flex:1; height:100%; border-radius:2px; background: #13331c;"></div>
            <div class="vu-led" data-idx="1" style="flex:1; height:100%; border-radius:2px; background: #13331c;"></div>
            <div class="vu-led" data-idx="2" style="flex:1; height:100%; border-radius:2px; background: #13331c;"></div>
            <div class="vu-led" data-idx="3" style="flex:1; height:100%; border-radius:2px; background: #13331c;"></div>
            <div class="vu-led" data-idx="4" style="flex:1; height:100%; border-radius:2px; background: #13331c;"></div>
            <div class="vu-led" data-idx="5" style="flex:1; height:100%; border-radius:2px; background: #13331c;"></div>
            <div class="vu-led" data-idx="6" style="flex:1; height:100%; border-radius:2px; background: #332c13;"></div>
            <div class="vu-led" data-idx="7" style="flex:1; height:100%; border-radius:2px; background: #332c13;"></div>
            <div class="vu-led" data-idx="8" style="flex:1; height:100%; border-radius:2px; background: #331813;"></div>
            <div class="vu-led" data-idx="9" style="flex:1; height:100%; border-radius:2px; background: #331313;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-family: var(--font-mono); color: var(--text-muted); padding: 0 1px;">
            <span>-48</span>
            <span>-24</span>
            <span>-18</span>
            <span>-6</span>
            <span>0</span>
            <span style="color:var(--status-error);">CLIP</span>
          </div>
        </div>
      </div>

      <!-- Active Diagnostics & 1-Click Fixes -->
      ${findings.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
          <span style="font-size: 12px; font-weight: 800; color: var(--status-error);">⚠️ ACTIVE FINDINGS (${findings.length})</span>
          ${findings.map((f, i) => `
            <div class="inspector-finding-card" style="background: rgba(255, 51, 102, 0.1); border: 1px solid var(--status-error); border-radius: var(--radius-sm); padding: 10px; font-size: 13px;">
              <strong style="color: var(--text-primary);">${f.code}</strong>
              <p style="color: var(--text-secondary); margin: 4px 0 8px 0; font-size: 12px; line-height: 1.5;">${f.message}</p>
              ${f.fix ? `<button class="tool-btn primary btn-apply-fix" data-finding-idx="${i}" style="font-size: 11px; padding: 4px 10px;">⚡ ${f.fix.label} →</button>` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="background: rgba(0, 230, 118, 0.1); border: 1px solid var(--status-success); border-radius: var(--radius-sm); padding: 10px; font-size: 13px; color: var(--status-success);">
          ✓ Signal routing on this node is clean and validated.
        </div>
      `}
    `;

    // Bind Clear Node Wires Button
    const clearWiresBtn = this.inspectorContent.querySelector('.btn-clear-node-wires');
    if (clearWiresBtn) {
      clearWiresBtn.addEventListener('click', () => {
        const toRemove = this.graph.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
        toRemove.forEach(c => this.graph.disconnect(c.id));
        this.renderSelection(node.id);
      });
    }

    // Bind Tone Generator Button & Live Meter Loop
    const toneBtn = this.inspectorContent.querySelector('.btn-tone-toggle');
    const toneSelect = this.inspectorContent.querySelector('.tone-type-select');
    
    toneBtn.addEventListener('click', () => {
      if (this.toneGen.isPlaying) {
        this.toneGen.stop();
        toneBtn.textContent = '▶️ Inject Tone';
        toneBtn.classList.remove('primary');
        this.resetMeterUI();
      } else {
        const type = toneSelect.value;
        const freq = type === 'sine' ? 1000 : 440;
        this.toneGen.start(type, freq, -18);
        toneBtn.textContent = '⏹️ Stop Tone';
        toneBtn.classList.add('primary');
        this.startMeterLoop();
      }
    });

    toneSelect.addEventListener('change', (e) => {
      if (this.toneGen.isPlaying) {
        const type = e.target.value;
        const freq = type === 'sine' ? 1000 : 440;
        this.toneGen.start(type, freq, -18);
      }
    });

    if (this.toneGen.isPlaying) {
      this.startMeterLoop();
    }

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

  generateSignalPathStory(node) {
    if (node.category === 'input') {
      const ch = node.getProperty('channelIndex', 1);
      const name = node.getProperty('name', 'Performer');
      const directIEMConn = this.graph.connections.find(c => c.fromNodeId === node.id && c.fromPortId.includes('direct_iem'));
      const usbConn = this.graph.connections.find(c => c.fromNodeId === node.id && c.fromPortId.includes('preamp_out'));
      
      let story = `<p><strong>Source:</strong> Physical microphone/instrument plugged into XLR Jack <strong>#${ch}</strong> on the XR18 stage box.</p>`;
      if (directIEMConn) {
        const targetNode = this.graph.getNode(directIEMConn.toNodeId);
        story += `<p><strong>In-Ear Monitors:</strong> Splits directly at the preamp with <strong>0ms latency</strong> into <em>${targetNode ? targetNode.title : 'IEM Bus'}</em> (pre-DAW, rock-solid volume).</p>`;
      }
      if (usbConn) {
        story += `<p><strong>To Computer:</strong> Streams clean raw audio over USB into Ableton Live for real-time plugin processing.</p>`;
      }
      return story;
    }

    if (node.category === 'usb_send') {
      const ch = node.getProperty('channelIndex', 1);
      const tap = node.getProperty('tapPoint', 'Analog In');
      return `
        <p><strong>Tap Point:</strong> Taps Input #${ch} at <strong>${tap}</strong>.</p>
        <p><strong>To DAW:</strong> Sends an uncolored, pure analog preamp signal over USB Send #${ch} into Ableton Live.</p>
      `;
    }

    if (node.category === 'daw') {
      const isStereo = node.getProperty('isStereoOut', false);
      const outCh = node.getProperty('outputChannel', 1);
      const plugins = node.getProperty('plugins', []);
      const pluginList = plugins.length > 0 ? plugins.join(' ➔ ') : 'Live Processing';

      return `
        <p><strong>In Ableton:</strong> Receives raw vocal/instrument on <em>Ext. In</em>.</p>
        <p><strong>FX Chain:</strong> Runs <strong>${pluginList}</strong>.</p>
        <p><strong>Return to Mixer:</strong> Outputs ${isStereo ? `stereo pair <strong>Ext. Out ${outCh}/${outCh+1}</strong>` : `mono <strong>Ext. Out ${outCh}</strong>`} directly into XR18 mixer strip.</p>
        <p><strong>Live Control:</strong> Controlled wirelessly out front by your physical M-Vave MIDI faders.</p>
      `;
    }

    if (node.category === 'strip') {
      const isStereo = node.getProperty('isStereoPair', false);
      const isUSB = node.getProperty('rtnsw', false);
      const ch = node.getProperty('channelIndex', 1);

      return `
        <p><strong>On Mixer:</strong> Channel Strip <strong>${isStereo ? `#${ch}/${ch+1} [Stereo]` : `#${ch}`}</strong>.</p>
        <p><strong>Input Source:</strong> Set to <strong>${isUSB ? 'USB Return (Ableton DAW FX)' : 'Analog XLR (Raw Mic)'}</strong>.</p>
        <p><strong>Fader Position:</strong> Parked at <strong>0 dB (Unity)</strong> so your Ableton MIDI controller has full live volume command.</p>
        <p><strong>Destination:</strong> Feeds processed sound out to <strong>Main FOH PA</strong> for the audience.</p>
      `;
    }

    if (node.category === 'main' || node.category === 'bus') {
      const isMain = node.getProperty('busType') === 'main_lr';
      if (isMain) {
        return `
          <p><strong>Front of House Master:</strong> Master Stereo Bus for the venue PA.</p>
          <p><strong>Outputs:</strong> Feeds physical XLR Main Out L & Main Out R jacks directly to the audience sound system.</p>
        `;
      } else {
        const aux = node.getProperty('auxIndex', 1);
        return `
          <p><strong>In-Ear Monitor Bus:</strong> Dedicated monitor feed for <strong>Aux ${aux}</strong>.</p>
          <p><strong>Outputs:</strong> Feeds physical XLR Aux Out ${aux} directly to the performer's wireless IEM transmitter.</p>
        `;
      }
    }

    return `<p>Signal flows through this node across connected sockets.</p>`;
  }

  generateMixingStationInstructions(node) {
    if (node.category === 'input') {
      const ch = node.getProperty('channelIndex', 1);
      const phantom = node.getProperty('phantom', false);
      return `
        <ul style="margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px;">
          <li><strong>Physical Jack:</strong> Plug into physical <strong>XLR Input #${ch}</strong> on the XR18 chassis.</li>
          <li><strong>Preamp Gain:</strong> Set gain between <strong>+24 dB and +36 dB</strong> until green signal LED lights steadily.</li>
          <li><strong>+48V Phantom:</strong> ${phantom ? 'Turn <strong>ON</strong> (required for condenser mics/active DIs).' : 'Leave <strong>OFF</strong> for standard dynamic mics (SM58, etc.).'}</li>
          <li><strong>Low-Cut HPF:</strong> Set to <strong>80 Hz - 100 Hz</strong> to eliminate stage foot-thumps and rumble.</li>
        </ul>
      `;
    }

    if (node.category === 'usb_send') {
      const ch = node.getProperty('channelIndex', 1);
      return `
        <ul style="margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px;">
          <li>In Mixing Station ➔ <strong>Routing ➔ USB Sends</strong>:</li>
          <li>Set <strong>USB Send ${ch}</strong> tap point to <strong>Analog In</strong>.</li>
          <li><em>Why? This ensures Ableton gets a pristine, clean raw feed before any mixer EQ or gate.</em></li>
        </ul>
      `;
    }

    if (node.category === 'daw') {
      const isStereo = node.getProperty('isStereoOut', false);
      const outCh = node.getProperty('outputChannel', 1);
      return `
        <ul style="margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px;">
          <li>In <strong>Ableton Live</strong>:</li>
          <li><strong>Audio From:</strong> Set to <code>Ext. In ${outCh}</code> (Monitor = <code>In</code>).</li>
          <li><strong>Audio To:</strong> Set directly to <code>Ext. Out ${isStereo ? `${outCh}/${outCh+1}` : `${outCh}`}</code> (<strong>NOT Master!</strong>).</li>
          <li><strong>Buffer Size:</strong> Set to <strong>64 samples @ 48 kHz</strong> in Audio Preferences for ultra-low ~2.8ms latency.</li>
        </ul>
      `;
    }

    if (node.category === 'strip') {
      const isStereo = node.getProperty('isStereoPair', false);
      const ch = node.getProperty('channelIndex', 1);
      return `
        <ul style="margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px;">
          <li><strong>CRITICAL:</strong> In Mixing Station ➔ <strong>Channel ${ch} ➔ Config / Input Source</strong>:</li>
          <li>Switch Input Source to <strong>USB Return ${ch}</strong> (<code>rtnsw = 1</code>).</li>
          ${isStereo ? `<li><strong>Stereo Link:</strong> In Mixing Station, turn on <strong>Stereo Link (${ch}-${ch+1})</strong>.</li>` : ''}
          <li><strong>Fader:</strong> Park fader at <strong>0 dB (Unity)</strong> so your wireless MIDI controller in Ableton controls live volume out front.</li>
        </ul>
      `;
    }

    if (node.category === 'main' || node.category === 'bus') {
      const isMain = node.getProperty('busType') === 'main_lr';
      if (isMain) {
        return `
          <ul style="margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px;">
            <li>On XR18 rear chassis: Connect <strong>Main Out L & R XLR</strong> to venue PA / amplifiers.</li>
            <li>Master Fader in Mixing Station controls final room ceiling volume.</li>
          </ul>
        `;
      } else {
        const aux = node.getProperty('auxIndex', 1);
        return `
          <ul style="margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px;">
            <li>On XR18 chassis: Connect <strong>Aux Out ${aux} XLR</strong> to performer's IEM transmitter.</li>
            <li>In Mixing Station: Adjust performer's mix under <strong>Aux ${aux} / Sends on Faders</strong>.</li>
          </ul>
        `;
      }
    }

    return `<p>Configure this node according to your show requirements.</p>`;
  }

  renderNodeSpecificInspectorControls(node) {
    if (node.category === 'input') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Preamp Gain:</span>
          <span style="font-family: var(--font-mono); color: var(--color-vocal); font-weight:700;">${node.getProperty('gain')} dB</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>+48V Phantom:</span>
          <span style="font-family: var(--font-mono); color: ${node.getProperty('phantom') ? 'var(--status-error)' : 'var(--text-muted)'}; font-weight:700;">${node.getProperty('phantom') ? 'ON (ACTIVE)' : 'OFF'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Low-Cut HPF:</span>
          <span style="font-family: var(--font-mono);">${node.getProperty('hpf') ? `${node.getProperty('hpf')} Hz` : 'OFF'}</span>
        </div>
      `;
    }

    if (node.category === 'strip') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Input Source:</span>
          <span style="font-family: var(--font-mono); color: ${node.getProperty('rtnsw') ? 'var(--color-playback)' : 'var(--color-vocal)'}; font-weight:700;">${node.getProperty('rtnsw') ? 'USB DAW Return' : 'Analog XLR In'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Fader Level:</span>
          <span style="font-family: var(--font-mono); color: var(--text-primary); font-weight:700;">${node.getProperty('fader')} dB</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Stereo Link:</span>
          <span style="font-family: var(--font-mono);">${node.getProperty('isStereoPair') ? 'LINKED (STEREO)' : 'MONO'}</span>
        </div>
      `;
    }

    if (node.category === 'usb_send') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Tap Point:</span>
          <span style="font-family: var(--font-mono); color: var(--color-keys); font-weight:700;">${node.getProperty('tapPoint')}</span>
        </div>
      `;
    }

    if (node.category === 'daw') {
      const plugins = node.getProperty('plugins', []);
      return `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Output Mode:</span>
          <span style="font-family: var(--font-mono); color: var(--color-playback); font-weight:700;">${node.getProperty('isStereoOut') ? 'Stereo (Dual L/R)' : 'Mono (1-Ch)'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Est. Latency:</span>
          <span style="font-family: var(--font-mono); color: var(--status-success);">2.8 ms (64 smp @ 48k)</span>
        </div>
        <div style="font-size: 13px; margin-top: 6px;">
          <span style="color: var(--text-muted);">Active Plugins:</span>
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--color-vocal); margin-top: 3px;">${plugins.length > 0 ? plugins.join(' ➔ ') : 'None'}</div>
        </div>
      `;
    }

    if (node.category === 'main' || node.category === 'bus') {
      return `
        <div style="display: flex; justify-content: space-between; font-size: 13.5px;">
          <span>Master Fader:</span>
          <span style="font-family: var(--font-mono); color: var(--color-main); font-weight:700;">${node.getProperty('masterFader')} dB</span>
        </div>
      `;
    }

    return '';
  }
}
