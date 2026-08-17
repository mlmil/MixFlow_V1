# Design Specification: MixStation Visual Node Routing Web App (ComfyUI-Style)

**Date**: 2026-08-17  
**Status**: Approved  
**Target Hardware**: Behringer X Air 18 (XR18 / X18 / MR18)  
**Host & Processing**: Mac Mini (Ableton Live 12/11 + Mixing Station Desktop / Mobile)  
**Use Case**: Live Cover Band Setup (5 Vocals, Guitar, Keyboards, Ableton Live Processing + Backing Tracks + In-Ear Monitoring)

---

## 1. Overview & Objectives

Navigating the routing matrix in Behringer's standard software and Mixing Station can be cumbersome, prone to error, and opaque during high-pressure live show preparations.

This application is a **ComfyUI-inspired modular node-graph web application** that provides:
1. **Visual Signal Flow Graph**: Interactive drag-and-drop cable patching between Physical Inputs, XR18 USB Send matrix, Ableton Live DAW tracks/racks/backing tracks, XR18 Channel Strips (with Analog vs. USB Return `rtnsw` switches), Aux Mix Buses (In-Ear Monitors 1-6), and Main FOH PA.
2. **Real-Time Routing Linter & Validation Engine**: Continuous graph analysis that flags phasing/double-monitoring hazards, feedback loops, dead USB returns, dangerous tap points, and phantom power misconfigurations with clear visual alerts and fixes.
3. **Multi-Format Export & Import Engine**: 
   - **Mixing Station JSON Presets & Scenes**: Valid JSON files structured for instant import into Mixing Station.
   - **Native X-Air OSC Snapshot (`.xair` / `.scn`)**: Line-by-line OSC snapshot files loadable into X-Air Edit or direct console state reload.
4. **Built-In Starter Rigs & Band Templates**:
   - *Cover Band 1:1 DAW Return* (5 Vocals + Guitar + Keys processed individually in Ableton, returned to Ch 1-7).
   - *Cover Band Stem Return* (Processed stems returned to XR18 Aux / stereo pairs, backing on Aux 17/18).
   - *Ableton Direct In-Ear Hybrid* (Monitor mixes generated inside Ableton and routed to XR18 Aux outputs).
5. **Integrated AI Assistant / Routing Co-Pilot Chat Sidebar**:
   - Built-in slide-out chat interface configured to connect with Antigravity / OpenAI / local API / Webhook to ask live routing questions, recommend gain staging, optimize tap points, and inspect routing anomalies.

---

## 2. UI Layout & Visual Design

### 2.1 Aesthetic & Design Language
- **Theme**: Deep matte charcoal/graphite (`#111215`, `#181a20`, `#222630`), crisp contrast accents, subtle dot-grid canvas with hardware audio rack styling.
- **Typography**: Inter (UI / Labels) and JetBrains Mono (Ports, dB values, OSC paths, validation errors).
- **Cables & Connections**: Fluid Bezier curves with directional pulse particle animation indicating audio signal flow.
- **Cable Color Coding**:
  - 🎤 **Mics / Vocals**: Electric Cyan (`#00e5ff`)
  - 🎸 **Guitars / Bass**: Amber Gold (`#ff9100`)
  - 🎹 **Keys / Synths**: Emerald Green (`#00e676`)
  - 💻 **Ableton Backing / Click**: Vivid Purple (`#d500f9`)
  - 🎧 **IEM / Aux Monitor Sends**: Yellow (`#ffd600`)
  - 🔊 **Main FOH L/R PA**: Coral Red (`#ff1744`)

### 2.2 Application Structure
```
+-----------------------------------------------------------------------------------------+
| [MixFlow XR18] [Templates v] [IEM Mode: XR18 Buses v] [Health: 🟢 Valid] [Export v] [Import] [AI Copilot Toggle] |
+------------------------------------------------------------------------+----------------+
|                                                                        |                |
|                                                                        |  🤖 AI Copilot |
|                                                                        |     Sidebar    |
|                        NODE CANVAS WORKSPACE                           |                |
|                                                                        |  - Live Graph  |
|  [Stage Inputs] ---> [XR18 USB Taps] ---> [Ableton Live Rack]          |    Context     |
|                                                  |                     |  - Anomaly     |
|  [Main PA Out]  <--- [XR18 Ch Strips] <-----------+                     |    Explanations|
|         ^                                                              |  - Gain staging|
|         |                                                              |    Advice      |
|  [Aux 1-6 IEMs]                                                        |  - Chat input  |
|                                                                        |                |
+------------------------------------------------------------------------+----------------+
| 🔍 Zoom: 100% | Pan | ⚠️ Rule Linter Banner: 0 Errors, 0 Warnings       | [MiniMap]      |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Node Architecture & Components

### 3.1 Stage Physical Inputs Node
- **Inputs**: 16 XLR/TRS combo inputs + Aux In 17/18 (TRS).
- **Per-Channel Parameters**:
  - Name label (editable: e.g. "Vox 1 Lead", "Gtr", "Keys L", "Keys R").
  - `+48V` Phantom Power toggle (with safety confirmation for line level).
  - Preamp Gain (`-12dB` to `+60dB`).
  - Polarity Invert (`0` / `180°`).
  - Low Cut / High Pass Filter (`OFF`, `20Hz - 400Hz`, `12/18/24 dB/oct`).
- **Outputs**: Analog Preamp Signal Socket.

### 3.2 XR18 USB Send Matrix Node (18 Channels Out to DAW)
- **Inputs**: 18 source connections from stage preamps or internal taps.
- **Tap Point Selectors**:
  - `Analog In` (Raw mic pre, pre-digital processing - *Recommended for DAW processing*).
  - `Pre-EQ` (Post-gain/HPF, pre-PEQ/dynamics).
  - `Post-EQ` (Post 4-band PEQ, pre-fader).
  - `Pre-Fader` (Post-EQ/Dynamics, pre-channel fader).
  - `Post-Fader` (Post-fader/mute).
- **Outputs**: USB Out 1–18 sockets.

### 3.3 Ableton Live Rig Node (Mac Mini)
- **DAW Inputs**: 18 USB Audio In channels.
- **Internal Processing Tracks**:
  - Live Vocal Tracks (Pitch correction, de-esser, compressor, saturation).
  - Guitar / Instrument Racks (Amp modelers, delay/reverb sends).
  - Backing Track Stems (Playback drums, synths, loops, click track).
- **DAW Outputs**: 18 USB Audio Out channels (assignable to 1:1 returns, stereo stems, or direct monitor feeds).

### 3.4 XR18 Channel Strips & Return Node
- **Inputs**: 18 USB Audio Return sockets + Analog Preamp bypass sockets.
- **Core Switches & Controls**:
  - `rtnsw` (**Return Switch**): Toggle between `Analog XLR Input` vs. `USB DAW Return`.
  - Channel Name & Color badge.
  - 4-Band Parametric EQ & Dynamics on/off.
  - Main LR Fader & Mute/On toggle (`/ch/XX/mix/on` and `/ch/XX/mix/fader`).
  - Aux Sends 1–6 knobs (`/ch/XX/mix/01..06/level`) with tap points (`Pre-EQ`, `Post-EQ`, `Pre-Fader`, `Post-Fader`, `Group`).
- **Outputs**: Main LR Bus feed, Aux 1–6 Bus feeds.

### 3.5 Output Destination Nodes
- **Main PA Node**: XLR Main L & Main R master fader, graphic/parametric EQ, limiter.
- **In-Ear Monitor / Stage Aux Nodes (Aux 1–6)**:
  - 6 individual bus outputs labeled with band member names (e.g. "Aux 1: Lead Vox IEM", "Aux 2: Drums IEM", "Aux 3: Guitar IEM", "Aux 4: Keys IEM", "Aux 5-6: Stereo Mix").
  - Master bus fader, 6-band PEQ/GEQ, limiter.

---

## 4. Real-Time Validation & Routing Linter

The engine evaluates graph topology and parameter states on every modification:

| Severity | Rule ID | Condition Checked | Warning / Fix Advice |
|---|---|---|---|
| 🚨 **Error** | `ERR_COMB_FILTER` | Stage input is unmuted in XR18 direct mix AND sent to Ableton with Ableton return unmuted to same mix. | "Double-Monitoring / Phase Hazard: Channel is mixed direct and via Ableton return. Turn off direct LR send or toggle `rtnsw` to USB." |
| 🚨 **Error** | `ERR_DEAD_RETURN` | Channel strip `rtnsw` is set to `USB Return`, but no Ableton output is connected. | "Dead Channel: Channel strip is listening to USB, but no DAW track is outputting to USB channel." |
| ⚠️ **Warning** | `WARN_TAP_POST_FADER` | Live DAW processing channel is tapped `Post-Fader` instead of `Analog In` / `Pre-EQ`. | "Tap Point Warning: Changing XR18 fader will alter Ableton plugin input level. Set tap to `Analog In`." |
| ⚠️ **Warning** | `WARN_PHANTOM_LINE` | +48V phantom engaged on a line-level instrument (keyboard / playback). | "Phantom Power Hazard: +48V active on line-level stereo channel. Verify DI box isolation." |
| 🚨 **Error** | `ERR_FEEDBACK_LOOP` | An Ableton output is routed back to an XR18 channel whose send is fed back into that same Ableton track. | "Feedback Loop: Signal routed in a circular loop between XR18 and Ableton." |
| ℹ️ **Info** | `INFO_UNROUTED_IEM` | Performer IEM bus has no vocal or backing track feeds assigned. | "IEM Incomplete: No vocal feeds assigned to Aux 3 monitor mix." |

---

## 5. Export / Import Engine

### 5.1 Mixing Station JSON Format
- Exports standard Mixing Station JSON structure containing:
  - `channelScopes`, `channelConfig` (names, colors, `insrc`, `preamp`, `rtnsw`).
  - `mixLevels`, `busSends`, `mainRouting`.
- Can be imported directly into Mixing Station via custom preset or offline scene storage.

### 5.2 Native XR18 OSC Text Format (`.xair` / `.scn`)
- Standard text format containing full OSC command tree:
  ```text
  /ch/01/config "Lead Vox" 1 In01 U01
  /ch/01/preamp +24.0 OFF OFF OFF 20.0 1
  /ch/01/mix ON 0.0 ON 0.0000
  /ch/01/mix/01 0.0 OFF PRE 0.0000
  /routing/usb ...
  ```

---

## 6. AI Routing Co-Pilot (Antigravity / LLM Chat Sidebar)

- **Sidebar Interface**: Slide-out chat panel docked to the right of the canvas.
- **Context Injection**: Automatically serializes the current graph topology, node settings, and active validation errors as JSON context.
- **Capabilities**:
  - "How do I route Vocal 3 so it has autotune in Ableton but sends low-latency direct sound to IEM 3?"
  - "Why is my guitar echoing in the Main PA?" (AI inspects graph and points to double-monitoring rule).
  - "Generate an acoustic trio routing template with 2 vocals and acoustic guitar."
- **Configurable Backend**: Works with direct browser LLM API keys (OpenAI / Anthropic / Gemini / local Ollama / MCP bridge).

---

## 7. Verification & Testing Plan

1. **Graph Serialization & Deserialization**:
   - Save graph state to JSON, reload, verify 100% wire and node parameter integrity.
2. **Linter Rule Matrix Test**:
   - Unit test each validation rule (`ERR_COMB_FILTER`, `ERR_DEAD_RETURN`, `WARN_TAP_POST_FADER`, `ERR_FEEDBACK_LOOP`) against known graph setups.
3. **Export Compatibility**:
   - Compare exported `.xair` OSC text snapshot against real XR18 backup file format (`Mix Station MCP/xair-mcp/backups/*.xair.txt`).
4. **Template Verification**:
   - Verify that all 4 pre-built templates load cleanly with 0 validation errors out of the box.
5. **Interactive UI Testing**:
   - Smooth 60fps pan/zoom, wire drag-and-drop snapping, node moving, touch/tablet responsive design.
