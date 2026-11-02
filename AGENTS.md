# AGENTS.md — Doppler Effect

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Interactive classical **Doppler effect** simulation for sound in a uniform medium. Drag source and observer, visualize expanding circular wavefronts, live frequency shift, waveform displays, and optional microphone listening.

Physics for educators: `doc/model.md`. Architecture: `doc/implementation-notes.md`.

## Key files

| Area | Location |
|---|---|
| Screen | `src/doppler-effect/DopplerEffectScreen.ts` |
| Model | `model/DopplerEffectModel.ts`, `DopplerCalculator.ts`, `MovableObject.ts`, `WaveGenerator.ts`, `WaveformManager.ts`, `DopplerEffectConstants.ts` |
| View | `view/DopplerEffectScreenView.ts`, `WaveManager.ts`, `MoveableObjectView.ts`, `GraphDisplayNode.ts`, `MicrophoneNode.ts`, `DopplerEffectScreenSummaryContent.ts` |
| Input | `DragHandlerManager.ts`, `KeyboardHandlerManager.ts` |
| Colors / strings | `DopplerEffectColors.ts`, `DopplerEffectNamespace.ts`, `src/i18n/StringManager.ts` |

## Model

`DopplerEffectModel` drives source and observer `MovableObject`s, emits circular wavefronts via `WaveGenerator`, and computes observed frequency through `DopplerCalculator`.

| Property | Type | Meaning |
|---|---|---|
| `sourceProperty` / `observerProperty` | `MovableObject` | position, velocity, frequency |
| `scenarioProperty` | `EnumerationProperty<Scenario>` | preset configurations (Free Play, approaching, …) |
| `soundSpeedProperty` | `NumberProperty` | medium speed *c* |
| `playProperty` | `BooleanProperty` | play/pause |
| `timeSpeedProperty` | `EnumerationProperty<TimeSpeed>` | NORMAL / SLOW |
| `movementBoundsProperty` | `Property<Bounds2>` | region source/observer may move in (view keeps it = visible area) |
| `waves` | `ObservableArray<Wave>` | expanding wavefronts |

Trail / grid / value visibility are view-only Properties on `DopplerEffectScreenView`.

### Stepping & numerics

- Observed frequency: `f' = f · (v − vₒ) / (v − vₛ)` where `vₒ` and `vₛ` are velocity components **along the line of sight**.
- Each wavefront expands from the source position **at emission**; radius grows at `c`. Wave restoration on time-scrub uses `WaveGenerator`'s own history (not snapshotted in `SimulationState`), pruned to what the 1000-step state history can still restore.
- **Step backward** (the only reverse path; `TimeSpeed` has no negative rate) restores the nearest *earlier* snapshot and truncates everything after it (states, trails, wave history, emission clock), so replaying forward is a single timeline.
- Sources/observers stop at `movementBoundsProperty`; velocities are clamped to `0.9·c` when *c* is lowered (no supersonic denominator).
- Keyboard presets `0`–`6` load scenario configurations.

### Keyboard

All shortcuts live in `DopplerEffectHotkeyData` (one window `keydown` listener in `KeyboardHandlerManager`; the help dialog rows come from the same data). Ctrl/Cmd/Alt combos are ignored. When a focused interactive element (button, draggable object, …) is the target, Space and the movement keys are left to it; a focused source/observer's own keyboard drag sets the same persistent `PHYSICS.KEYBOARD_SPEED` velocity as the global arrow keys.

## Accessibility

Follows the shared [OpenLyceum accessibility convention](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md).
`DopplerEffectScreenView` registers `DopplerEffectScreenSummaryContent` (live current-details: emitted/observed
frequency + play state) via the `screenSummaryContent` super-option, and orders the PDOM through a wrapper
`Node`. A11y strings live under the top-level `a11y` key in each locale JSON, via
`StringManager.getA11yStrings()`.

## Compliance carve-outs

- **Root constants:** `src/DopplerEffectConstants.ts` (sim-wide); no separate nested primary constants module.
- **Domain clock:** `timeSpeedProperty` plus the simulation-state history (for the step-backward button) drive the clock instead of composing fleet-standard `TimeModel`.

## Testing

| Path | Purpose |
|---|---|
| `vitest.config.ts` | Fleet template: `happy-dom`, `setupFiles: ["./tests/setup.ts"]`, `execArgv: ["--expose-gc"]` |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

Actual specs:

- `tests/DopplerCalculator.test.ts`
- `tests/DopplerEffectModel.test.ts` — scenario/emission, mic detection, bounds, history, step-back regressions
- `tests/WaveGenerator.test.ts`
- `tests/memory-leak.test.ts`

Run `npm test`. CI runs the suite when a `test` script is present.

## Development notes

- Microphone node listens at an arbitrary point (can differ from observer icon). The Preferences → Simulation microphone toggle sets the live microphone state (and its Reset All default). Projector mode via Preferences → Visual.
