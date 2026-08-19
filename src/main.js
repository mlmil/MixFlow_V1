import './styles/theme.css';
import './styles/canvas.css';
import './styles/copilot.css';
import './styles/main.css';

import { Graph } from './graph/Graph.js';
import { CanvasRenderer } from './canvas/CanvasRenderer.js';
import { InteractionHandler } from './canvas/InteractionHandler.js';
import { RoutingLinter } from './linter/RoutingLinter.js';
import { TemplateManager } from './templates/index.js';
import { exportMixingStationJSON } from './exporter/MixingStationExporter.js';
import { exportXAirSnapshot } from './exporter/XAirOscExporter.js';
import { ConfigImporter } from './exporter/ConfigImporter.js';
import { CopilotSidebar } from './copilot/CopilotSidebar.js';
import { Inspector } from './components/Inspector.js';
import { TemplateEditorModal } from './components/TemplateEditorModal.js';
import { ToneGenerator } from './audio/ToneGenerator.js';
import { StageInputNode } from './nodes/StageInputNode.js';
import { USBSendMatrixNode } from './nodes/USBSendMatrixNode.js';
import { AbletonLiveNode } from './nodes/AbletonLiveNode.js';
import { ChannelStripNode } from './nodes/ChannelStripNode.js';
import { OutputBusNode } from './nodes/OutputBusNode.js';

function initApp() {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('MixFlow: canvas-container element not found');
    return;
  }

  let activeTemplateId = 'zeroLatencyIEM';
  let graph = TemplateManager.loadTemplate(activeTemplateId) || new Graph();

  const toneGen = new ToneGenerator();
  let renderer = new CanvasRenderer({ container, graph });
  let interactions = new InteractionHandler({ renderer, graph });
  const copilot = new CopilotSidebar({ container: document.body, graph });
  const inspector = new Inspector({ container: document.body, graph, toneGen });

  // Clicking any node selects it in the Inspector
  container.addEventListener('click', (e) => {
    const nodeEl = e.target.closest('.graph-node');
    if (nodeEl) {
      const nodeId = nodeEl.id.replace('dom_', '');
      inspector.select(nodeId);
    }
  });

  function updateLinterStatus() {
    const diagnostics = RoutingLinter.lint(graph);
    const pill = document.getElementById('status-pill');
    if (!pill) return;
    const dot = pill.querySelector('.status-dot');
    const text = document.getElementById('status-text');

    const errors = diagnostics.filter(d => d.severity === 'error');
    const warnings = diagnostics.filter(d => d.severity === 'warning');

    if (dot) dot.className = 'status-dot';

    if (errors.length > 0) {
      if (dot) dot.classList.add('error');
      if (text) text.textContent = `${errors.length} Conflict${errors.length > 1 ? 's' : ''}`;
    } else if (warnings.length > 0) {
      if (dot) dot.classList.add('warning');
      if (text) text.textContent = `${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`;
    } else {
      if (dot) dot.classList.add('valid');
      if (text) text.textContent = 'Routing Valid (Clean)';
    }

    renderer.nodeElements.forEach((el, nodeId) => {
      const node = graph.getNode(nodeId);
      if (node) {
        el.classList.toggle('node-error', node.hasError);
        el.classList.toggle('node-warning', node.hasWarning);
      }
    });
  }

  graph.on('change', () => updateLinterStatus());
  updateLinterStatus();

  // Populate Templates Dropdown
  const templateSelect = document.getElementById('template-select');
  function refreshTemplateOptions(selectedId = activeTemplateId) {
    if (!templateSelect) return;
    activeTemplateId = selectedId;
    templateSelect.innerHTML = '';
    const all = TemplateManager.getAllTemplates();

    const groupBuiltin = document.createElement('optgroup');
    groupBuiltin.label = 'Built-in Templates';

    const groupCustom = document.createElement('optgroup');
    groupCustom.label = 'My Custom Templates';

    Object.values(all).forEach(tmpl => {
      const opt = document.createElement('option');
      opt.value = tmpl.id;
      opt.textContent = tmpl.name;
      if (tmpl.id === selectedId) opt.selected = true;

      if (tmpl.isBuiltin) {
        groupBuiltin.appendChild(opt);
      } else {
        groupCustom.appendChild(opt);
      }
    });

    const blankOpt = document.createElement('option');
    blankOpt.value = 'blank';
    blankOpt.textContent = '➕ Blank Graph';

    templateSelect.appendChild(groupBuiltin);
    if (groupCustom.children.length > 0) {
      templateSelect.appendChild(groupCustom);
    }
    templateSelect.appendChild(blankOpt);
  }

  refreshTemplateOptions(activeTemplateId);

  function loadTemplateIntoCanvas(id) {
    if (id === 'blank') {
      graph.clear();
      updateLinterStatus();
      return;
    }

    const loaded = TemplateManager.loadTemplate(id);
    if (loaded) {
      activeTemplateId = id;
      graph.clear();
      loaded.nodes.forEach(n => graph.addNode(n));
      loaded.connections.forEach(c => graph.connect(c));
      renderer.renderAll();
      updateLinterStatus();
      refreshTemplateOptions(id);
    }
  }

  // Template Switcher
  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
      loadTemplateIntoCanvas(e.target.value);
    });
  }

  // Open Template Editor & Manager Modal
  const btnManageTemplates = document.getElementById('btn-manage-templates');
  if (btnManageTemplates) {
    btnManageTemplates.addEventListener('click', () => {
      TemplateEditorModal.open({
        activeTemplateId,
        graph,
        onTemplateChange: (newId, shouldLoad = false) => {
          refreshTemplateOptions(newId);
          if (shouldLoad) {
            loadTemplateIntoCanvas(newId);
          }
        }
      });
    });
  }

  // Inspector & Co-Pilot Toggles
  const btnInspectorToggle = document.getElementById('btn-inspector-toggle');
  if (btnInspectorToggle) {
    btnInspectorToggle.addEventListener('click', () => {
      if (inspector.isOpen) {
        inspector.close();
      } else {
        const firstNode = graph.nodes.values().next().value;
        if (firstNode) inspector.select(firstNode.id);
        else inspector.open();
      }
    });
  }

  const btnCopilotToggle = document.getElementById('btn-copilot-toggle');
  if (btnCopilotToggle) {
    btnCopilotToggle.addEventListener('click', () => {
      copilot.toggle();
    });
  }

  // Tone Generator Modal
  const btnToneGen = document.getElementById('btn-tone-gen');
  if (btnToneGen) {
    btnToneGen.addEventListener('click', () => {
      showToneGenModal(toneGen);
    });
  }

  // Export Mixing Station JSON
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const json = exportMixingStationJSON(graph);
      const jsonStr = JSON.stringify(json, null, 2);
      showModal('Mixing Station JSON Export', jsonStr, 'mixing_station_scene.json', 'application/json');
    });
  }

  // Export XR18 .xair Snapshot
  const btnExportOsc = document.getElementById('btn-export-osc');
  if (btnExportOsc) {
    btnExportOsc.addEventListener('click', () => {
      const oscText = exportXAirSnapshot(graph);
      showModal('XR18 Native OSC Snapshot (.xair)', oscText, 'xr18_routing_snapshot.xair.txt', 'text/plain');
    });
  }

  // Import Dialog
  const btnImport = document.getElementById('btn-import');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.txt,.xair,.scn';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            const imported = ConfigImporter.importJSON(parsed);
            graph.clear();
            imported.nodes.forEach(n => graph.addNode(n));
            renderer.renderAll();
            updateLinterStatus();
          } catch (err) {
            alert('Could not parse imported configuration file. Please ensure it is valid Mixing Station JSON.');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // Pan / Zoom Toolbar Controls
  const zoomLevelText = document.getElementById('zoom-level');
  container.addEventListener('canvasTransform', (e) => {
    if (zoomLevelText) zoomLevelText.textContent = `${Math.round(e.detail.zoom * 100)}%`;
  });

  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      renderer.setZoom(renderer.zoom * 1.2);
    });
  }

  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      renderer.setZoom(renderer.zoom / 1.2);
    });
  }

  const btnZoomFit = document.getElementById('btn-zoom-fit');
  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => {
      renderer.setZoom(0.75);
      renderer.setPan(60, 60);
    });
  }

  const btnClearCanvas = document.getElementById('btn-clear-canvas');
  if (btnClearCanvas) {
    btnClearCanvas.addEventListener('click', () => {
      if (confirm('Clear entire routing canvas?')) {
        graph.clear();
        updateLinterStatus();
      }
    });
  }

  // Add Node Menu
  const btnAddNode = document.getElementById('btn-add-node');
  if (btnAddNode) {
    btnAddNode.addEventListener('click', () => {
      const nodeTypes = [
        { label: 'XLR Stage Preamp (Input)', category: 'input' },
        { label: 'XR18 USB Send Tap', category: 'usb_send' },
        { label: 'Ableton Live DAW Track', category: 'daw' },
        { label: 'XR18 Channel Strip', category: 'strip' },
        { label: 'Aux IEM Monitor Bus', category: 'bus' }
      ];

      const pick = prompt('Choose node type to add:\n1: XLR Stage Preamp\n2: USB Send Tap\n3: Ableton DAW Track\n4: Channel Strip\n5: Aux IEM Bus', '1');
      if (!pick) return;

      const idx = parseInt(pick, 10) - 1;
      if (idx >= 0 && idx < nodeTypes.length) {
        let newNode;
        const x = 300;
        const y = 300;

        switch (nodeTypes[idx].category) {
          case 'input': newNode = new StageInputNode({ channelIndex: graph.nodes.size + 1, x, y }); break;
          case 'usb_send': newNode = new USBSendMatrixNode({ channelIndex: graph.nodes.size + 1, x, y }); break;
          case 'daw': newNode = new AbletonLiveNode({ trackName: 'New Live Track', x, y }); break;
          case 'strip': newNode = new ChannelStripNode({ channelIndex: graph.nodes.size + 1, x, y }); break;
          case 'bus': newNode = new OutputBusNode({ busType: 'aux_iem', auxIndex: 3, x, y }); break;
        }

        if (newNode) {
          graph.addNode(newNode);
          updateLinterStatus();
        }
      }
    });
  }

  function showToneGenModal(tg) {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');

    overlay.innerHTML = `
      <div class="modal-card" style="width: 440px;">
        <div class="modal-header">
          <span style="font-weight: 700; font-size: 13px;">🔊 Web Audio Test Tone Generator</span>
          <button class="modal-close-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;">✕</button>
        </div>
        <div class="modal-body" style="gap: 14px;">
          <p style="font-size: 11.5px; color: var(--text-secondary);">
            Inject test signals into your headphones or stage audio interface to check gain staging, verify monitor levels, and test frequency response.
          </p>

          <div class="node-control-row">
            <label>Waveform / Signal:</label>
            <select class="node-select modal-tone-type" style="width: 160px;">
              <option value="sine" ${tg.type === 'sine' ? 'selected' : ''}>Sine Wave (Pure Tone)</option>
              <option value="pink" ${tg.type === 'pink' ? 'selected' : ''}>Pink Noise (Full Spectrum)</option>
              <option value="white" ${tg.type === 'white' ? 'selected' : ''}>White Noise</option>
            </select>
          </div>

          <div class="node-control-row freq-row">
            <label>Frequency:</label>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="range" class="modal-tone-freq" min="40" max="12000" step="10" value="${tg.frequency}" style="width: 120px;" />
              <span class="freq-display mono" style="font-size: 11px; color: var(--color-keys);">${tg.frequency} Hz</span>
            </div>
          </div>

          <div class="node-control-row">
            <label>Output Level:</label>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="range" class="modal-tone-level" min="-40" max="0" step="1" value="${tg.levelDb}" style="width: 120px;" />
              <span class="level-display mono" style="font-size: 11px; color: var(--status-warning);">${tg.levelDb} dBFS</span>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
            <button class="tool-btn btn-modal-toggle-tone primary" style="padding: 8px 16px; font-weight: 700;">
              ${tg.isPlaying ? '⏹️ Stop Tone' : '▶️ Play Test Tone'}
            </button>
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const toggleBtn = overlay.querySelector('.btn-modal-toggle-tone');
    const typeSelect = overlay.querySelector('.modal-tone-type');
    const freqInput = overlay.querySelector('.modal-tone-freq');
    const freqDisplay = overlay.querySelector('.freq-display');
    const levelInput = overlay.querySelector('.modal-tone-level');
    const levelDisplay = overlay.querySelector('.level-display');

    freqInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      freqDisplay.textContent = `${val} Hz`;
      tg.setFrequency(val);
    });

    levelInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      levelDisplay.textContent = `${val} dBFS`;
      tg.setLevel(val);
    });

    toggleBtn.addEventListener('click', () => {
      if (tg.isPlaying) {
        tg.stop();
        toggleBtn.textContent = '▶️ Play Test Tone';
        toggleBtn.classList.remove('active');
      } else {
        tg.start(typeSelect.value, parseInt(freqInput.value, 10), parseInt(levelInput.value, 10));
        toggleBtn.textContent = '⏹️ Stop Tone';
        toggleBtn.classList.add('active');
      }
    });

    document.body.appendChild(overlay);
  }

  function showModal(title, content, filename, mimeType) {
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <span style="font-weight: 600; font-size: 13px;">${title}</span>
          <button class="modal-close-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:16px;">✕</button>
        </div>
        <div class="modal-body">
          <textarea class="modal-textarea" readonly>${content}</textarea>
          <div style="display:flex; justify-content:flex-end; gap:8px;">
            <button class="tool-btn btn-copy">📋 Copy to Clipboard</button>
            <button class="tool-btn primary btn-download">⬇️ Download File</button>
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('.btn-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(content);
      alert('Copied to clipboard!');
    });

    overlay.querySelector('.btn-download').addEventListener('click', () => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.body.appendChild(overlay);
  }
}

// Immediate + Safe DOM Ready Initialization for Safari & Chromium
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
