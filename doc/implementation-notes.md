# Implementation Notes - Doppler Effect

Developer-facing notes on the architecture. The physics is documented for educators in
[model.md](./model.md).

## Architecture Overview

Doppler Effect is a single-screen SceneryStack sim with a modular model and a layered view. Physics
runs in model space (metres, seconds); the view applies a fixed `ModelViewTransform2` (origin at layout
center, inverted y).

```
src/doppler-effect/model/
  ├─ DopplerEffectModel.ts     coordinator: step, reset, scenarios, time reversal
  ├─ MovableObject.ts          position, velocity, moving flag, trail history
  ├─ WaveGenerator.ts          emit fronts, expand radius, detect microphone crossing
  ├─ DopplerCalculator.ts      f_obs, findWavesAtObserver (pure physics helpers)
  ├─ WaveformManager.ts        emitted/observed waveform buffers + phase
  └─ DopplerEffectConstants.ts PHYSICS, SCALE, WAVE, SOUND_DATA, scenarios

src/doppler-effect/view/
  ├─ DopplerEffectScreenView.ts   layers: wave, object, graph, control
  ├─ managers/
  │   ├─ WaveManager.ts           draws expanding circles from model.waves
  │   ├─ DragHandlerManager.ts    pointer drag source/observer/mic
  │   └─ KeyboardHandlerManager.ts  arrows, scenario hotkeys 0–6
  ├─ components/
  │   ├─ MoveableObjectView.ts, MicrophoneNode.ts, GraphDisplayNode.ts
  │   ├─ ControlPanelNode.ts, GridNode.ts, VectorDisplay.ts, …
  │   └─ TrailPath.ts             motion trails (age + count limits)
  └─ utils/Sound.ts               Web Audio playback from observed frequency

src/doppler-effect/DopplerEffectScreen.ts
src/preferences/ DopplerEffectPreferencesModel, dopplerEffectQueryParameters
src/DopplerEffectColors.ts     source green, observer purple (avoid redshift/blueshift confusion)
```

Data flows Model → View through AXON `Property` objects and `model.waves` (`ObservableArray`). User
drags update `MovableObject` position Properties on the model.

## Key design decisions

- **Specialized components.** `DopplerEffectModel` coordinates but delegates emission
  (`WaveGenerator`), shift (`DopplerCalculator`), and waveforms (`WaveformManager`). Keeps unit-tested
  pieces isolated.
- **Emission clock.** `WaveGenerator` advances `lastWaveTime` by whole 1/f₀ intervals (no per-frame
  drift) and stores each front in `waveHistory` for time reversal.
- **Microphone crossing.** Detection uses front **sweep** (previous radius < distance ≤ current radius)
  so fast fronts are not missed between frames.
- **Scenario presets.** `Scenario` enumeration + `SCENARIO_CONFIGS` set initial velocities and moving
  flags without full reset; keyboard 0–6 loads scenarios.
- **Time reversal.** Negative Δt restores nearest kinematic snapshot and `WaveGenerator.restoreWavesFromHistory`;
  waves are not duplicated in `SimulationState` snapshots.
- **Waveform update throttling.** At slow time speed, waveform buffers update every N frames to keep
  display stable.

## Model / view design

- `step(dt)` applies `modelDt = dt · SCALE.TIME · timeSpeed`, updates positions, generates/ages waves,
  runs Doppler + waveform update, sets `waveDetectedProperty` for the mic.
- `WaveManager` reads `waves` ObservableArray; no physics in the view.
- `Sound.ts` drives audio from observed frequency when enabled.
- Colors documented in `DopplerEffectColors.ts` to avoid conflating UI colours with shift terminology.

## Disposal conventions

Most nodes and Property links are screen-lifetime. `DragHandlerManager` includes dispose cleanup for
pointer listeners. Expand `tests/memory-leak.test.ts` if adding dynamic layers or scenario rebuild paths.

## Testing

`npm test` (vitest, `--expose-gc`):

- `tests/DopplerCalculator.test.ts` — Doppler formula and arrival-time logic
- `tests/WaveGenerator.test.ts` — emission cadence, aging, crossing detection
- `tests/memory-leak.test.ts` — fleet WeakRef/GC regression

## Multi-screen simulations

Single-screen sim. To split source-motion and observer-motion labs, follow [SceneryStackTemplate `doc/multi-screen.md`](https://github.com/OpenLyceum/SceneryStackTemplate/blob/main/doc/multi-screen.md).
