# MixStation Routing UI Prototype Design

**Date:** 2026-08-17  
**Status:** Approved for spec review  
**Milestone:** Polished interactive frontend prototype

## Goal

Create a self-contained React + TypeScript + Vite application under `mixstation-routing-ui/` that demonstrates a ComfyUI-style visual routing workflow for a mocked Behringer XR18 and Ableton Live setup.

The prototype is designed to validate the routing UX, visual hierarchy, and diagnostic workflow before adding real hardware connectivity or production configuration exporters.

## Scope

### Included

- Dark, hardware-inspired node-graph canvas.
- Default “hero rig” showing:
  - Five vocal inputs.
  - Guitar input.
  - Stereo keys.
  - XR18 USB send matrix.
  - Ableton Live processing and backing-track sections.
  - XR18 return channels.
  - Six IEM buses.
  - Main L/R FOH output.
- Draggable grouped nodes and socket-based patching.
- Color-coded, animated signal cables.
- Mocked meters and signal-flow pulses.
- Real-time validation for:
  - Double monitoring / comb filtering.
  - Dead USB returns.
  - Unsafe processing tap points.
  - Circular feedback loops.
  - Phantom power on line-level inputs.
- Template switching and reset behavior.
- Bottom inspector for selected node/channel details.
- AI Copilot sidebar with graph-aware mocked responses.
- Prototype graph JSON import/export and local browser persistence.

### Excluded from this milestone

- Live XR18 or Mixing Station connections.
- WebSocket or OSC control.
- Real audio metering.
- Production Mixing Station JSON export.
- Native `.xair` / `.scn` export.
- Backend services or real LLM integration.

## Technical Approach

- React + TypeScript + Vite.
- React Flow for graph interaction and rendering.
- Zustand for normalized graph state, UI selection, templates, and simulation state.
- CSS design tokens and focused component styles for the visual system.
- Deterministic mock data so demos and tests are repeatable.

React Flow is preferred over a custom SVG/canvas engine because the milestone prioritizes a polished interactive prototype and needs reliable dragging, sockets, zooming, selection, and connection handling quickly. The domain graph model remains independent of React Flow so a future hardware adapter can be added without replacing the UI state model.

## Layout

- **Top toolbar:** rig selector, health status, zoom controls, simulate/reset actions, template controls, import/export, and Copilot toggle.
- **Main canvas:** grouped Stage, XR18, Ableton, and Output regions connected by animated signal cables.
- **Right sidebar:** AI Copilot with current-graph context and mocked troubleshooting replies.
- **Bottom inspector:** selected node/channel controls and linter details.
- **Canvas background:** graphite surface with a subtle dot grid.

## Interaction Model

- Drag nodes within their groups.
- Drag from an output socket to an input socket to create a cable.
- Reject incompatible connections with an inline explanation.
- Select a cable to highlight its signal path and related linter findings.
- Select a node to open its controls in the inspector.
- Swap templates by replacing the complete mocked graph state.
- Run signal simulation to animate directional cable pulses and meter movement.
- Show linter findings as node badges, cable highlights, and a consolidated health status.
- Provide safe mock “Fix” actions, such as switching `rtnsw` to USB or muting a direct path.

The default hero rig intentionally includes a small number of realistic warnings so the diagnostic workflow is immediately visible without making the initial state unusable.

## Visual System

- Backgrounds: `#111215`, `#181a20`, `#222630`.
- UI typography: Inter.
- Technical values and OSC paths: JetBrains Mono.
- Cable colors:
  - Vocals: electric cyan.
  - Guitar: amber.
  - Keys: emerald green.
  - Ableton/backing: vivid purple.
  - IEM: yellow.
  - FOH: coral red.
- Active cables use restrained glow and directional pulse animation.
- Errors are red, warnings amber, and informational states blue.
- Metering uses compact bars and peak indicators rather than a full mixer surface.

## State Model

The application should use a normalized domain state containing:

- `nodes`: node identity, type, group, position, and typed configuration.
- `ports`: port identity, direction, channel metadata, and compatible signal types.
- `connections`: source port, target port, signal category, and enabled state.
- `channels`: gain, phantom, polarity, HPF, `rtnsw`, fader, mute, tap point, and bus sends.
- `validation`: rule results with severity, affected entities, explanation, and optional fix action.
- `ui`: selected node/cable, active template, inspector state, Copilot visibility, and zoom.
- `simulation`: running state, pulse timing, and deterministic meter values.

React Flow node and edge objects should be derived from this state rather than treated as the source of truth.

## Validation Rules

Each rule receives the normalized graph state and returns a structured result:

```ts
type ValidationResult = {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  entityIds: string[];
  fix?: { label: string; apply: () => void };
};
```

Rules should be pure and independently testable. Initial rules are:

- `ERR_COMB_FILTER`
- `ERR_DEAD_RETURN`
- `WARN_TAP_POST_FADER`
- `ERR_FEEDBACK_LOOP`
- `WARN_PHANTOM_LINE`

## Templates

The first release includes four deterministic templates:

1. Five-vocal, guitar, and keys 1:1 DAW return.
2. Stem/subgroup returns.
3. Ableton direct-IEM hybrid.
4. Acoustic trio / clean recording.

Template loading replaces the complete graph, channel configuration, and simulation defaults, preventing stale connections or warnings from leaking between rigs.

## Testing and Verification

- Unit tests for graph add/remove/reconnect/template/reset transitions.
- Unit tests for every initial linter rule with minimal graph fixtures.
- Graph JSON serialization round-trip test.
- Rendering check for the complete hero rig and all cable categories.
- Template-switching check for stale-state cleanup.
- Browser smoke test covering load, node selection, cable creation, warning display, and applying a fix.

Success means a new user can understand the full signal path within seconds, identify why a warning exists, and correct it through the visual interface.

## Future Extension Points

- XR18 OSC and Mixing Station adapters can consume the normalized graph state.
- Production serializers can replace the prototype JSON exporter.
- Real metering can replace deterministic simulation values.
- The Copilot sidebar can receive serialized graph context from a backend or local model.
