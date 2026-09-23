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
| `isPlayingProperty` | `BooleanProperty` | play/pause |
| `timeSpeedProperty` | `Property<TimeSpeed>` | simulation rate |
| `showTrailsProperty` | `BooleanProperty` | motion trails |
| `waves` | `ObservableArray<Wave>` | expanding wavefronts |

### Stepping & numerics

- Observed frequency: `f' = f · (v − vₒ) / (v − vₛ)` where `vₒ` and `vₛ` are velocity components **along the line of sight**.
- Each wavefront expands from the source position **at emission**; radius grows at `c`. Wave restoration on time-scrub uses `WaveGenerator`'s own history (not snapshotted in `SimulationState`).
- Keyboard presets `0`–`6` load scenario configurations.

## Accessibility

Follows the shared [OpenLyceum accessibility convention](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md).
`DopplerEffectScreenView` registers `DopplerEffectScreenSummaryContent` (live current-details: emitted/observed
frequency + play state) via the `screenSummaryContent` super-option, and orders the PDOM through a wrapper
`Node`. A11y strings live under the top-level `a11y` key in each locale JSON, via
`StringManager.getA11yStrings()`.

## Compliance carve-outs

- **Root constants:** `src/DopplerEffectConstants.ts` (sim-wide); no separate nested primary constants module.
- **Domain clock:** `timeSpeedProperty` (including reverse) and simulation-state history drive the clock instead of composing fleet-standard `TimeModel` (`src/common/TimeModel.ts` is present for shared reference only).


### `package.json` overrides

JSON cannot carry comments, so the rationale for forced transitive pins lives here. Prefer
**tilde (`~`) or exact** versions — caret (`^`) lets minors drift under what is meant to be a
hard pin. Dependabot ignores these three names (see `.github/dependabot.yml`) so it does not
open PRs that fight the overrides. Revisit when SceneryStack drops or re-pins them upstream.

| Override | Pin | Why |
|---|---|---|
| `lodash` | `~4.18.1` | SceneryStack declares `~4.17.12`. Bump clears Dependabot/npm advisories patched in 4.18.x (e.g. GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh). |
| `three` | `~0.125.2` | SceneryStack declares `^0.104.0`. Floor is 0.125.0 for GHSA-fq6p-x6j3-cmmq (ReDoS). Staying on the 0.125 line avoids a larger API jump; **0.125.x still has open CVEs** (e.g. XSS GHSA-7vvq-7r29-5vg3, fixed only in ≥0.137.0). Remove this override if/when SceneryStack stops depending on `three` or pins a patched line itself. LightPropagation keeps a higher `three` pin — do not force 0.125 there. |
| `brace-expansion` | `~5.0.9` | Transitive via `vite-plugin-pwa` / Workbox. Clears npm audit (originally GHSA-mh99-v99m-4gvg; keep ≥5.0.9 for GHSA-rgw5-rvv9-x895). |

## Testing

Fleet-standard Vitest layout:

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `jsdom` environment (no `setupFiles`); `scenerystack` aliased to `scenerystack/dot`; `execArgv: ["--expose-gc"]` |
| `tests/**/*.test.ts` | Model/physics unit tests |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression (fleet pattern) |

Actual specs:

- `tests/DopplerCalculator.test.ts`
- `tests/WaveGenerator.test.ts`
- `tests/memory-leak.test.ts`

Vitest environment: **`jsdom`** (not the fleet-default `happy-dom`) — physics tests need browser globals without pulling the full SceneryStack barrel.

Run `npm test`. CI runs the suite when a `test` script is present.

## Commands

```bash
npm run lint && npm run check && npm run build
npm test
```

`npm run release` intentionally skips `npm test` in some sims — append `&& npm test` before the version bump so a release cannot ship a failing suite.

## Development notes

- Microphone node listens at an arbitrary point (can differ from observer icon). Motion trails and projector mode supported via preferences.
