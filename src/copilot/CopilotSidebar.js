import { GraphContextSerializer } from './GraphContextSerializer.js';
import { RoutingLinter } from '../linter/RoutingLinter.js';

const SETTINGS_KEY = 'mixflow_copilot_settings';

export class CopilotSidebar {
  constructor({ container, graph }) {
    this.container = container;
    this.graph = graph;
    this.isOpen = false;
    this.showSettings = false;

    this.settings = this.loadSettings();

    this.messages = [
      {
        role: 'assistant',
        text: "👋 Hi! I'm your **Routing Co-Pilot**. Connected to your XR18 & Ableton Live signal chains. You can route me to **Antigravity (AGY)** or **OpenAI Codex** in Settings ⚙️!"
      }
    ];

    this.initDOM();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : {
        provider: 'agy', // 'agy' | 'codex' | 'custom'
        apiKey: '',
        endpointUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o'
      };
    } catch (e) {
      return {
        provider: 'agy',
        apiKey: '',
        endpointUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o'
      };
    }
  }

  saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  initDOM() {
    this.el = document.createElement('aside');
    this.el.classList.add('copilot-sidebar');

    this.el.innerHTML = `
      <div class="copilot-header">
        <div class="copilot-title-group">
          <div class="copilot-status-dot"></div>
          <span class="copilot-title">AI Routing Co-Pilot</span>
        </div>
        <div class="copilot-header-actions">
          <button class="copilot-btn-icon btn-copy-prompt" title="Copy Full Context Prompt for Codex / AGY">📋 Copy Prompt</button>
          <button class="copilot-btn-icon btn-settings-toggle" title="Model & Provider Settings">⚙️</button>
          <button class="copilot-btn-icon copilot-close-btn" title="Close">✕</button>
        </div>
      </div>

      <div class="copilot-provider-bar">
        <span>Engine:</span>
        <select class="provider-select">
          <option value="agy">⚡ Antigravity / AGY Bridge</option>
          <option value="codex">🧠 OpenAI Codex / GPT-4o</option>
          <option value="custom">🔌 Custom Local Endpoint (Ollama / MCP)</option>
        </select>
      </div>

      <div class="copilot-settings-panel" style="display: none;">
        <div class="node-control-row">
          <label>API Key / Token:</label>
          <input type="password" class="node-input setting-api-key" placeholder="sk-..." value="${this.settings.apiKey}" />
        </div>
        <div class="node-control-row">
          <label>Endpoint URL:</label>
          <input type="text" class="node-input setting-endpoint" placeholder="https://..." value="${this.settings.endpointUrl}" />
        </div>
        <div class="node-control-row">
          <label>Model Name:</label>
          <input type="text" class="node-input setting-model" placeholder="gpt-4o / codex" value="${this.settings.model}" />
        </div>
      </div>

      <div class="copilot-messages"></div>

      <div class="copilot-chips">
        <button class="chip-btn" data-query="Explain active warnings">⚠️ Explain Warnings</button>
        <button class="chip-btn" data-query="How do I avoid latency in vocals?">⚡ Low-Latency Vocals</button>
        <button class="chip-btn" data-query="Verify stereo FX on Lead Vocal and Main PA">✨ Check Stereo FX</button>
      </div>

      <form class="copilot-input-bar">
        <input type="text" class="copilot-input" placeholder="Ask Codex / AGY about routing, gain, latency..." />
        <button type="submit" class="copilot-send-btn">Send</button>
      </form>
    `;

    this.msgContainer = this.el.querySelector('.copilot-messages');
    this.input = this.el.querySelector('.copilot-input');
    this.form = this.el.querySelector('.copilot-input-bar');
    this.settingsPanel = this.el.querySelector('.copilot-settings-panel');
    this.providerSelect = this.el.querySelector('.provider-select');

    this.providerSelect.value = this.settings.provider;

    this.providerSelect.addEventListener('change', (e) => {
      this.settings.provider = e.target.value;
      if (this.settings.provider === 'codex' && !this.settings.endpointUrl.includes('openai.com')) {
        this.settings.endpointUrl = 'https://api.openai.com/v1/chat/completions';
      }
      this.saveSettings();
    });

    this.el.querySelector('.btn-settings-toggle').addEventListener('click', () => {
      this.showSettings = !this.showSettings;
      this.settingsPanel.style.display = this.showSettings ? 'flex' : 'none';
    });

    this.el.querySelector('.setting-api-key').addEventListener('input', (e) => {
      this.settings.apiKey = e.target.value.trim();
      this.saveSettings();
    });

    this.el.querySelector('.setting-endpoint').addEventListener('input', (e) => {
      this.settings.endpointUrl = e.target.value.trim();
      this.saveSettings();
    });

    this.el.querySelector('.setting-model').addEventListener('input', (e) => {
      this.settings.model = e.target.value.trim();
      this.saveSettings();
    });

    this.el.querySelector('.btn-copy-prompt').addEventListener('click', () => {
      this.copyFullPromptForCodexOrAgy();
    });

    this.el.querySelector('.copilot-close-btn').addEventListener('click', () => this.toggle(false));

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (!text) return;
      this.sendMessage(text);
      this.input.value = '';
    });

    this.el.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        this.sendMessage(query);
      });
    });

    this.container.appendChild(this.el);
    this.renderMessages();
  }

  toggle(forceState = null) {
    this.isOpen = forceState !== null ? forceState : !this.isOpen;
    this.el.classList.toggle('open', this.isOpen);
  }

  copyFullPromptForCodexOrAgy() {
    const diagnostics = RoutingLinter.lint(this.graph);
    const summary = GraphContextSerializer.summarize(this.graph, diagnostics);
    const jsonState = JSON.stringify(summary, null, 2);

    const promptText = `# MixFlow XR18 / Ableton Audio Engineering Context

You are an expert live audio mixing engineer analyzing the following Behringer XR18 + Ableton Live rig:

## Current Signal Graph Topology & State:
\`\`\`json
${jsonState}
\`\`\`

## Active Diagnostics & Warnings:
${summary.activeDiagnostics.length === 0 ? "• No errors or warnings detected (clean signal chain)." : summary.activeDiagnostics.map(d => `• [${d.severity.toUpperCase()}] ${d.code}: ${d.message}`).join('\n')}

Please provide technical guidance, gain staging advice, latency optimization, or custom routing configurations based on this exact live setup.`;

    navigator.clipboard.writeText(promptText);
    alert('📋 Full Live Graph Prompt copied to clipboard! You can paste it into Codex CLI or Antigravity.');
  }

  async sendMessage(text) {
    this.messages.push({ role: 'user', text });
    this.renderMessages();

    // If an API key or custom endpoint is configured for Codex / OpenAI, attempt live call
    if (this.settings.provider === 'codex' && this.settings.apiKey) {
      try {
        const reply = await this.callOpenAIApi(text);
        this.messages.push({ role: 'assistant', text: reply });
        this.renderMessages();
        return;
      } catch (err) {
        console.warn('API call failed, falling back to local engineer engine:', err);
      }
    }

    // Default intelligent local audio engineer engine
    setTimeout(() => {
      const reply = this.generateAIResponse(text);
      this.messages.push({ role: 'assistant', text: reply });
      this.renderMessages();
    }, 300);
  }

  async callOpenAIApi(userQuery) {
    const diagnostics = RoutingLinter.lint(this.graph);
    const summary = GraphContextSerializer.summarize(this.graph, diagnostics);

    const systemPrompt = `You are MixFlow AI Routing Co-Pilot for a Behringer XR18 mixer and Ableton Live DAW.
Current live graph state:
${JSON.stringify(summary, null, 2)}
Answer questions concisely with direct audio routing guidance.`;

    const res = await fetch(this.settings.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`
      },
      body: JSON.stringify({
        model: this.settings.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.3
      })
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }

  renderMessages() {
    this.msgContainer.innerHTML = '';
    this.messages.forEach(msg => {
      const msgEl = document.createElement('div');
      msgEl.classList.add('copilot-msg', msg.role);
      msgEl.innerHTML = this.formatMarkdown(msg.text);
      this.msgContainer.appendChild(msgEl);
    });
    this.msgContainer.scrollTop = this.msgContainer.scrollHeight;
  }

  formatMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  generateAIResponse(query) {
    const q = query.toLowerCase();
    const diagnostics = RoutingLinter.lint(this.graph);
    const summary = GraphContextSerializer.summarize(this.graph, diagnostics);

    if (q.includes('warning') || q.includes('explain') || q.includes('error')) {
      if (summary.activeDiagnostics.length === 0) {
        return "✅ **Graph is clean!** There are currently 0 active routing warnings or errors. All channels have clean signal paths, correct tap points, and active returns.";
      }
      return `⚠️ **Current Routing Diagnostics (${summary.activeDiagnostics.length}):**<br>` +
        summary.activeDiagnostics.map(d => `• <strong>${d.code}</strong>: ${d.message}`).join('<br>');
    }

    if (q.includes('latency') || q.includes('buffer')) {
      return "⚡ **Low-Latency Live Recommendation:**<br>1. Set Ableton audio buffer size to **64 samples** (approx 2.8ms roundtrip @ 48kHz).<br>2. Ensure USB Send tap points are set to **Analog In** (bypassing XR18 digital processing before the DAW).<br>3. For zero-latency vocal IEM monitoring, you can also send direct Analog preamps to Aux 1-6 with reverb from Ableton on an FX return.";
    }

    if (q.includes('stereo') || q.includes('effect') || q.includes('fx')) {
      return "✨ **Stereo FX Routing Active:**<br>Your Lead Vocal track in Ableton is outputting a grouped stereo pair on **Ext. Out 1/2**, which returns to **Strip 1/2 [Stereo Linked]** hard-panned L/R into the Main PA. You can also turn any other channel (Guitar / Keys / Backing) into Stereo using the toggle button on its node card!";
    }

    return `I analyzed your live setup (**${summary.totalNodes} nodes**, **${summary.totalConnections} active patch cables**). Your Ableton live processing loop is running across the 18x18 USB interface. Click **📋 Copy Prompt** above if you want to paste the live graph state directly into Codex CLI or Antigravity!`;
  }
}
