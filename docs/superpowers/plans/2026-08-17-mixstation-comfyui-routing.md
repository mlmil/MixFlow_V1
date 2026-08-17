# MixStation ComfyUI Visual Routing Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular, ComfyUI-style visual node-graph web application for Behringer XR18 / Mixing Station that enables live cover bands to visually patch audio signal chains across stage preamps, USB 18x18 DAW processing (Ableton Live), channel strips, IEM buses, and FOH PA, with real-time routing error detection, multi-format export/import (.json, .xair, .scn), and an AI routing co-pilot sidebar.

**Architecture:** A high-performance client-side SPA (Vite + Vanilla JS/Canvas/SVG) implementing a DAG node-graph engine with interactive Bezier cable physics, a real-time audio routing linter rules engine, a bidirectional configuration serializer/exporter, a band template system, and a contextual AI co-pilot chat sidebar.

**Tech Stack:** JavaScript (ES Modules), HTML5 Canvas & SVG, Modern CSS (Custom Properties / Design Tokens), Vite, Vitest for automated unit testing.

**Spec:** [docs/superpowers/specs/2026-08-17-mixstation-comfyui-routing-design.md](file:///Volumes/VADER/Projects/MixStationUI/docs/superpowers/specs/2026-08-17-mixstation-comfyui-routing-design.md)

## Global Constraints
- Pure client-side zero-dependency runtime for core node graph logic.
- Dark ComfyUI hardware rack theme (`#111215`, `#181a20`, `#222630`) with animated bezier wires.
- Full support for Behringer XR18 18-input / 18-output USB audio interface architecture.
- 100% test coverage for graph serialization, linter rules, and OSC/.xair snapshot generation.

---

### Task 1: Project Scaffolding, CSS Design System & Test Harness

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/styles/theme.css`
- Create: `src/styles/canvas.css`
- Create: `tests/setup.js`

**Interfaces:**
- Produces: Base Vite dev/test environment with Vitest, responsive layout shell, and CSS variables.

- [ ] **Step 1: Create package.json and vite.config.js**
- [ ] **Step 2: Install dependencies (vite, vitest)**
- [ ] **Step 3: Create index.html and theme.css with ComfyUI dark palette tokens**
- [ ] **Step 4: Verify test suite runs clean (`npm test`)**
- [ ] **Step 5: Commit scaffolding**

---

### Task 2: Core Graph Data Model & Interactive Node Canvas Engine

**Files:**
- Create: `src/graph/Graph.js`
- Create: `src/graph/Node.js`
- Create: `src/graph/Port.js`
- Create: `src/graph/Connection.js`
- Create: `src/canvas/CanvasRenderer.js`
- Create: `src/canvas/InteractionHandler.js`
- Test: `tests/graph.test.js`

**Interfaces:**
- Produces: `Graph`, `Node`, `Port`, `Connection` data structures and `CanvasRenderer` for fluid pan/zoom, node dragging, socket snapping, and SVG Bezier cable rendering.

- [ ] **Step 1: Write failing tests for Graph, Node, Port, Connection linking and serialization in `tests/graph.test.js`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement Graph, Node, Port, Connection classes with event dispatchers**
- [ ] **Step 4: Implement CanvasRenderer with dynamic Bezier curve calculations and signal pulse styling**
- [ ] **Step 5: Implement mouse/pointer pan, zoom, wire drag-and-drop snapping**
- [ ] **Step 6: Run tests and verify PASS**
- [ ] **Step 7: Commit Task 2**

---

### Task 3: XR18 & Ableton Live Audio Node Library

**Files:**
- Create: `src/nodes/StageInputNode.js`
- Create: `src/nodes/USBSendMatrixNode.js`
- Create: `src/nodes/AbletonLiveNode.js`
- Create: `src/nodes/ChannelStripNode.js`
- Create: `src/nodes/OutputBusNode.js`
- Create: `src/nodes/NodeRegistry.js`
- Test: `tests/nodes.test.js`

**Interfaces:**
- Consumes: `Node`, `Port` from Task 2.
- Produces: Concrete audio node classes with gain/phantom controls, tap point selectors (`Analog In`, `Pre-EQ`, `Post-EQ`, `Pre-Fader`, `Post-Fader`), Ableton track racks, `rtnsw` return switches, and Aux 1-6 IEM sends.

- [ ] **Step 1: Write failing tests for audio node properties and port definitions in `tests/nodes.test.js`**
- [ ] **Step 2: Implement StageInputNode (XLR 1-16 + Aux 17/18 with 48V, Gain, Low Cut, Invert)**
- [ ] **Step 3: Implement USBSendMatrixNode (18 Tap point selectors)**
- [ ] **Step 4: Implement AbletonLiveNode (DAW tracks, FX racks, backing stems, USB 1-18 routing)**
- [ ] **Step 5: Implement ChannelStripNode (rtnsw switch, PEQ, dyn, fader, mute, Aux 1-6 sends)**
- [ ] **Step 6: Implement OutputBusNode (Main PA LR, Aux 1-6 IEM monitors)**
- [ ] **Step 7: Register all node types in NodeRegistry**
- [ ] **Step 8: Run tests and verify PASS**
- [ ] **Step 9: Commit Task 3**

---

### Task 4: Real-Time Routing Linter & Validation Engine

**Files:**
- Create: `src/linter/RoutingLinter.js`
- Create: `src/linter/rules.js`
- Test: `tests/linter.test.js`

**Interfaces:**
- Consumes: `Graph`, `Node`, `Connection` from Tasks 2 & 3.
- Produces: `RoutingLinter.lint(graph)` returning list of diagnostic issues (`ERR_COMB_FILTER`, `ERR_DEAD_RETURN`, `WARN_TAP_POST_FADER`, `ERR_FEEDBACK_LOOP`, `WARN_PHANTOM_LINE`).

- [ ] **Step 1: Write failing tests for each linter rule in `tests/linter.test.js`**
- [ ] **Step 2: Implement comb filtering / double-monitoring detection rule**
- [ ] **Step 3: Implement dead USB return detection rule**
- [ ] **Step 4: Implement live processing post-fader tap point warning rule**
- [ ] **Step 5: Implement circular feedback loop detection rule**
- [ ] **Step 6: Implement phantom power safety check rule**
- [ ] **Step 7: Connect linter to UI status badge and node warning callouts**
- [ ] **Step 8: Run tests and verify PASS**
- [ ] **Step 9: Commit Task 4**

---

### Task 5: Multi-Format Exporter & Importer (Mixing Station JSON & XR18 OSC Snapshot)

**Files:**
- Create: `src/exporter/MixingStationExporter.js`
- Create: `src/exporter/XAirOscExporter.js`
- Create: `src/exporter/ConfigImporter.js`
- Test: `tests/exporter.test.js`

**Interfaces:**
- Consumes: `Graph` state.
- Produces: `exportMixingStationJSON(graph)`, `exportXAirSnapshot(graph)`, `importConfig(fileContent)`.

- [ ] **Step 1: Write failing tests for Mixing Station JSON structure and .xair OSC lines in `tests/exporter.test.js`**
- [ ] **Step 2: Implement Mixing Station JSON exporter with channelScopes and routing parameters**
- [ ] **Step 3: Implement Native XR18 OSC snapshot text exporter (`/ch/XX/config`, `/ch/XX/preamp`, `/ch/XX/mix`, etc.)**
- [ ] **Step 4: Implement JSON and snapshot file importer & parser**
- [ ] **Step 5: Run tests and verify PASS**
- [ ] **Step 6: Commit Task 5**

---

### Task 6: Pre-Built Band Starter Templates

**Files:**
- Create: `src/templates/coverBandDirect.js`
- Create: `src/templates/coverBandStems.js`
- Create: `src/templates/abletonDirectIEM.js`
- Create: `src/templates/acousticTrio.js`
- Create: `src/templates/index.js`
- Test: `tests/templates.test.js`

**Interfaces:**
- Produces: Ready-to-load template configurations pre-populating 5 vocals, guitar, keys, Ableton live plugins, backing tracks, and IEM bus sends.

- [ ] **Step 1: Write tests ensuring each template loads cleanly into the graph with 0 fatal linter errors**
- [ ] **Step 2: Implement Cover Band 1:1 DAW Return template (Ch 1-5 Vox, Ch 6 Gtr, Ch 7-8 Keys, Ableton autotune/amps, rtnsw=1)**
- [ ] **Step 3: Implement Cover Band Stem Return template (Vocals stem, Band stem, Playback on Aux 17/18)**
- [ ] **Step 4: Implement Ableton Direct IEM Hybrid template**
- [ ] **Step 5: Implement Acoustic Trio template**
- [ ] **Step 6: Run tests and verify PASS**
- [ ] **Step 7: Commit Task 6**

---

### Task 7: AI Routing Co-Pilot Chat Sidebar

**Files:**
- Create: `src/copilot/CopilotSidebar.js`
- Create: `src/copilot/GraphContextSerializer.js`
- Create: `src/styles/copilot.css`
- Test: `tests/copilot.test.js`

**Interfaces:**
- Consumes: `Graph` state, `RoutingLinter` diagnostics.
- Produces: Slide-out chat UI with graph state context extraction, rule error explainers, and configurable API connection.

- [ ] **Step 1: Write tests for `GraphContextSerializer` converting current routing into compact LLM context**
- [ ] **Step 2: Build responsive slide-out CopilotSidebar component**
- [ ] **Step 3: Add quick-action prompts ("Explain active warnings", "Optimize vocal latency", "Check IEM mix")**
- [ ] **Step 4: Implement mock / live API response handler for offline and online use**
- [ ] **Step 5: Run tests and verify PASS**
- [ ] **Step 6: Commit Task 7**

---

### Task 8: Main Application Shell, UI Polish & End-to-End Verification

**Files:**
- Create: `src/main.js`
- Modify: `index.html`
- Create: `src/styles/main.css`

**Interfaces:**
- Produces: Complete working web app running in browser via `npm run dev` with full toolbar, minimap, modal dialogs, and responsive canvas.

- [ ] **Step 1: Wire up main.js uniting canvas, toolbar, template switcher, exporter, linter, and copilot**
- [ ] **Step 2: Implement drag-and-drop file import for JSON/.xair snapshots**
- [ ] **Step 3: Add smooth particle animation to active signal cables**
- [ ] **Step 4: Run full test suite (`npm test`) and build verification (`npm run build`)**
- [ ] **Step 5: Commit complete application**
