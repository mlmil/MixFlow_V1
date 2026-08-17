# MixStation Routing UI Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished self-contained React prototype that visualizes a mocked XR18/Ableton hero rig, supports interactive patching, and explains routing hazards through a live linter.

**Architecture:** Keep a normalized domain graph as the source of truth, derive React Flow nodes/edges from it, and isolate pure validation and template logic from UI components. Use deterministic mock data and local browser persistence; hardware, OSC, and production exporters remain outside this milestone.

**Tech Stack:** React, TypeScript, Vite, React Flow, Zustand, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-17-mixstation-routing-ui-prototype-design.md`

## Global Constraints

- Create the app under `mixstation-routing-ui/` as a self-contained project.
- Use React + TypeScript + Vite, React Flow, and Zustand.
- The default screen must load the complete mocked hero rig.
- Do not add live XR18/Mixing Station connectivity, OSC/WebSocket control, real metering, production export formats, backend services, or real LLM integration.
- Use a normalized domain graph as the source of truth; React Flow objects are derived views.
- Keep linter rules pure and independently testable.
- Use deterministic mock data so tests and demos are repeatable.

## File Map

- `mixstation-routing-ui/package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`: project setup and scripts.
- `mixstation-routing-ui/src/domain/types.ts`: graph, channel, validation, template, and UI types.
- `mixstation-routing-ui/src/domain/heroRig.ts`: deterministic hero-rig nodes, ports, channels, and connections.
- `mixstation-routing-ui/src/domain/templates.ts`: four complete deterministic template definitions.
- `mixstation-routing-ui/src/domain/linter.ts`: pure routing validation rules and fix descriptors.
- `mixstation-routing-ui/src/domain/serialization.ts`: prototype JSON import/export and local-storage shape.
- `mixstation-routing-ui/src/state/useRoutingStore.ts`: Zustand state and graph actions.
- `mixstation-routing-ui/src/graph/reactFlowModel.ts`: domain-to-React-Flow projection.
- `mixstation-routing-ui/src/components/Toolbar.tsx`: top controls and health status.
- `mixstation-routing-ui/src/components/RoutingCanvas.tsx`: React Flow canvas, groups, nodes, edges, and connection UX.
- `mixstation-routing-ui/src/components/RoutingNode.tsx`: reusable node card and ports.
- `mixstation-routing-ui/src/components/Inspector.tsx`: selected node/channel controls and linter fixes.
- `mixstation-routing-ui/src/components/CopilotPanel.tsx`: mocked graph-aware assistant sidebar.
- `mixstation-routing-ui/src/App.tsx`, `src/main.tsx`: composition and app entry point.
- `mixstation-routing-ui/src/styles/tokens.css`, `src/styles/app.css`: visual tokens, layout, canvas, cables, meters, and responsive styling.
- `mixstation-routing-ui/tests/*.test.ts`: domain and state tests.
- `mixstation-routing-ui/tests/e2e/hero-rig.spec.ts`: browser smoke test.

### Task 1: Scaffold the self-contained frontend

**Files:**
- Create: `mixstation-routing-ui/package.json`
- Create: `mixstation-routing-ui/index.html`
- Create: `mixstation-routing-ui/vite.config.ts`
- Create: `mixstation-routing-ui/tsconfig.json`
- Create: `mixstation-routing-ui/tsconfig.node.json`
- Create: `mixstation-routing-ui/src/main.tsx`
- Create: `mixstation-routing-ui/src/App.tsx`
- Create: `mixstation-routing-ui/src/styles/tokens.css`
- Create: `mixstation-routing-ui/src/styles/app.css`

**Interfaces:**
- Produces a runnable Vite app with `npm run dev`, `npm run build`, and `npm run test` scripts.

- [ ] Add dependencies for React, React DOM, React Flow, Zustand, Vitest, Testing Library, and Playwright.
- [ ] Configure TypeScript, Vite, and a test environment using jsdom.
- [ ] Add an app shell with the toolbar, canvas, inspector, and Copilot panel regions.
- [ ] Add graphite tokens, Inter/JetBrains Mono font stacks, dot-grid canvas styling, and responsive layout primitives.
- [ ] Run `npm install` and `npm run build`; verify the empty shell builds successfully.

### Task 2: Define the normalized domain graph and hero rig

**Files:**
- Create: `mixstation-routing-ui/src/domain/types.ts`
- Create: `mixstation-routing-ui/src/domain/heroRig.ts`
- Create: `mixstation-routing-ui/src/domain/templates.ts`
- Test: `mixstation-routing-ui/tests/heroRig.test.ts`

**Interfaces:**
- Produces `GraphState`, `NodeModel`, `PortModel`, `ConnectionModel`, `ChannelState`, and `TemplateDefinition` types.
- Produces `createHeroRig(): GraphState` and `templateDefinitions: TemplateDefinition[]`.

- [ ] Define typed node groups, directions, signal categories, channel settings, and template metadata.
- [ ] Build the complete hero rig with stage inputs, XR18 send/return nodes, Ableton processing/backing nodes, six IEM buses, and Main L/R.
- [ ] Give every connection stable IDs and compatible port metadata.
- [ ] Add four templates, each replacing the full graph state and simulation defaults.
- [ ] Test hero-rig counts, stable IDs, required groups, six IEM outputs, FOH output, and template completeness.

### Task 3: Implement pure linter rules and graph serialization

**Files:**
- Create: `mixstation-routing-ui/src/domain/linter.ts`
- Create: `mixstation-routing-ui/src/domain/serialization.ts`
- Test: `mixstation-routing-ui/tests/linter.test.ts`
- Test: `mixstation-routing-ui/tests/serialization.test.ts`

**Interfaces:**
- Consumes `GraphState`.
- Produces `validateGraph(graph: GraphState): ValidationResult[]` and `serializeGraph(graph: GraphState): string` / `deserializeGraph(json: string): GraphState`.

- [ ] Implement `ERR_COMB_FILTER` for simultaneous direct and processed paths to the same mix.
- [ ] Implement `ERR_DEAD_RETURN` for USB-selected channels without a DAW output.
- [ ] Implement `WARN_TAP_POST_FADER` for live processing channels using Post-Fader taps.
- [ ] Implement `ERR_FEEDBACK_LOOP` using graph traversal over XR18/Ableton paths.
- [ ] Implement `WARN_PHANTOM_LINE` for phantom-enabled line-level inputs.
- [ ] Return affected entity IDs and safe fix descriptors without mutating input state.
- [ ] Add strict JSON validation and a version field for prototype files.
- [ ] Test every rule with minimal fixtures plus a valid graph with no findings.

### Task 4: Add Zustand state and React Flow projection

**Files:**
- Create: `mixstation-routing-ui/src/state/useRoutingStore.ts`
- Create: `mixstation-routing-ui/src/graph/reactFlowModel.ts`
- Test: `mixstation-routing-ui/tests/store.test.ts`

**Interfaces:**
- Consumes `GraphState`, `templateDefinitions`, `validateGraph`, and serialization helpers.
- Produces store actions: `connectPorts`, `removeConnection`, `selectEntity`, `loadTemplate`, `resetHeroRig`, `applyFix`, `toggleSimulation`, `setCopilotOpen`, `importGraph`, and `exportGraph`.

- [ ] Initialize the store from `createHeroRig()` and derive validation results after graph mutations.
- [ ] Reject incompatible or duplicate connections with a user-facing connection error.
- [ ] Persist the latest valid graph JSON and restore it safely from local storage.
- [ ] Keep simulation state deterministic with stable mock levels and pulse timing.
- [ ] Project domain nodes and connections into React Flow node/edge objects, including validation badges and cable classes.
- [ ] Test connection lifecycle, template replacement, reset, linter refresh, serialization round-trip, and fix application.

### Task 5: Build the interactive routing canvas and nodes

**Files:**
- Create: `mixstation-routing-ui/src/components/RoutingCanvas.tsx`
- Create: `mixstation-routing-ui/src/components/RoutingNode.tsx`
- Modify: `mixstation-routing-ui/src/App.tsx`
- Modify: `mixstation-routing-ui/src/styles/app.css`
- Test: `mixstation-routing-ui/tests/canvas.test.tsx`

**Interfaces:**
- Consumes projected React Flow models and store actions.
- Produces node selection, socket connection, cable selection, zoom/pan, animated simulation pulses, and inline connection errors.

- [ ] Render grouped Stage, XR18, Ableton, and Output regions with the hero rig visible on initial load.
- [ ] Render typed source/target handles and reject invalid connections through the store.
- [ ] Render cable colors by signal category, active pulse styling during simulation, and linter-linked highlights.
- [ ] Show compact mock meters and peak indicators on active signal nodes.
- [ ] Test the canvas renders expected group labels, node selection updates the store, and a connection interaction calls the graph action.

### Task 6: Add toolbar, inspector, templates, and Copilot

**Files:**
- Create: `mixstation-routing-ui/src/components/Toolbar.tsx`
- Create: `mixstation-routing-ui/src/components/Inspector.tsx`
- Create: `mixstation-routing-ui/src/components/CopilotPanel.tsx`
- Modify: `mixstation-routing-ui/src/App.tsx`
- Modify: `mixstation-routing-ui/src/styles/app.css`
- Test: `mixstation-routing-ui/tests/panels.test.tsx`

**Interfaces:**
- Consumes store selections, validation results, templates, and graph serialization actions.
- Produces toolbar controls, channel inspector controls, linter fixes, template switching, graph JSON buttons, and mocked graph-aware Copilot replies.

- [ ] Show health status counts and severity styling in the toolbar.
- [ ] Add template selector, simulate/reset controls, zoom controls, import/export buttons, and Copilot toggle.
- [ ] Add inspector controls for gain, phantom, polarity, HPF, `rtnsw`, tap point, fader, mute, and bus sends where applicable.
- [ ] Render validation findings with affected entities and safe fix buttons.
- [ ] Generate deterministic Copilot responses from selected entity and active validation findings.
- [ ] Test template switching, warning fix behavior, Copilot visibility, and graph export button behavior.

### Task 7: Polish visual behavior and verify the prototype

**Files:**
- Modify: `mixstation-routing-ui/src/styles/tokens.css`
- Modify: `mixstation-routing-ui/src/styles/app.css`
- Create: `mixstation-routing-ui/playwright.config.ts`
- Create: `mixstation-routing-ui/tests/e2e/hero-rig.spec.ts`

**Interfaces:**
- Consumes the completed UI and store behavior.
- Produces a visually coherent desktop-first prototype and repeatable browser smoke coverage.

- [ ] Tune spacing, typography, node density, cable glow, warning badges, panel shadows, and responsive breakpoints against the approved visual direction.
- [ ] Verify the hero rig is understandable within seconds and warnings are visually distinct without overwhelming the canvas.
- [ ] Add a Playwright smoke test for load, node selection, warning display, applying a fix, and simulation pulses.
- [ ] Run `npm run test`, `npm run build`, and the Playwright smoke test; record any environment limitations.
- [ ] Update `.ai/AI_WORKLOG.md` with files changed, checks run, results, and the next handoff state.
