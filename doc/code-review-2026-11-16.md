# Code review — DopplerEffect — 2026-11-16

Reviewed commit: `e2d4fe7ead241ec31662d42e698f1e87d0f9015c`. Working tree was clean at review start.
Selected as one of the ten oldest catalogued simulations by the earliest root commit's author timestamp: `2025-03-26T10:45:55-04:00`. This is source-history age, not GitHub repository-creation age.

## Scope

Wave generation and retarded signal lookup; sound-speed constraints; scenario/reset; snapshot restoration and waveform rewind.

This is a targeted functional code review with broad automated checks, not a full release certification. The findings below describe the reviewed commit. The remediation section records the subsequent corrections.

## Findings

### P2: Restore medium and emission state consistently when rewinding

Location: `src/doppler-effect/model/DopplerEffectModel.ts:520`.

Snapshots contain kinematics but omit sound speed and emitted frequency. Restoring a snapshot writes old velocities directly without restoring the medium or rerunning the sound-speed clamp. After recording a source at 274.4 m/s and lowering sound speed from 343 to 171.5 m/s, the listener correctly clamps the source to 154.35 m/s. One Step Back restores 274.4 m/s while sound speed remains 171.5 m/s. The simulation now violates its subsonic assumption, on which wave ordering and Doppler frequency calculations depend.

Recommendation: snapshot and restore the physical parameters plus emission-clock state together with kinematics. If parameters intentionally remain live during rewind, enforce the subsonic constraint on every restored state and explicitly reconcile the wave/emission history. Test edits to both sound speed and frequency across rewind/replay.

## Validation

Node v26.13.0. `npm run lint`, `npm run check`, `npm run build`, `npm run check:architecture`, and the existing `npm test` suite pass (47 tests). Local Baton compliance passes with warnings; GitHub security settings could not be read by the checker.

Template drift is pre-existing and separate from the functional findings:

```text
❌ DopplerEffect (2)
   differs       biome.json — differs outside extendable keys
   dependency    @biomejs/biome — @biomejs/biome@^2.6.5 ≠ template ^2.6.6
```

## Reproducer

Temporarily save the following as `tests/review-diagnostic.test.ts`, then run `npm test -- tests/review-diagnostic.test.ts` inside this repository under Node 26. The assertion intentionally fails on the reviewed commit. Remove the temporary test afterward.

```ts
import {it,expect} from "vitest";
import {Vector2} from "scenerystack/dot";
import {DopplerEffectModel} from "../src/doppler-effect/model/DopplerEffectModel.js";
import {PHYSICS} from "../src/DopplerEffectConstants.js";
it("rewind preserves subsonic velocity after medium speed edit",()=>{
 const m=new DopplerEffectModel();
 m.sourceVelocityProperty.value=new Vector2(PHYSICS.SOUND_SPEED*0.8,0);m.sourceMovingProperty.value=true;
 m.step(1/60,true);m.step(1/60,true);
 m.soundSpeedProperty.value=PHYSICS.SOUND_SPEED*0.5;
 console.log("clamped",m.sourceVelocityProperty.value.magnitude,m.soundSpeedProperty.value);
 m.step(-1/60,true);
 console.log("restored",m.sourceVelocityProperty.value.magnitude,m.soundSpeedProperty.value);
 expect(m.sourceVelocityProperty.value.magnitude).toBeLessThan(m.soundSpeedProperty.value);
});
```

## Limits and retained evidence

No new browser fuzz, live video/camera, heap profiling, manual screen-reader audit, remote dependency audit, or educator sign-off was performed in this review. Unit mocks and source tracing do not substitute for these checks. The November 15 fleet-fuzz results in the superproject review log are prior evidence, not a new browser run.

Validation logs and original diagnostic sources/output are retained locally in `/tmp/oldest-review/`; temporary evidence may be removed by the system. This report preserves the actionable reproducers.


## Remediation — 2026-11-16

Rewind snapshots now include sound speed, emitted frequency and the exact emission/cooldown clock. The medium is restored before historical velocities; wavefront replay preserves phases and radii across parameter edits.

Permanent regression coverage: `tests/DopplerEffectModel.test.ts`. The historical diagnostic above describes the original failure; use the permanent regression suite to validate the corrected transport path.

Aligned template-owned configuration and shared dependency declarations with SceneryStackTemplate: Biome ^2.6.6, its 2.6.6 schema and locked executable, dependency ordering, and Resonance’s Vitest declaration where applicable. Preserved documented per-simulation configuration exceptions.

Final validation and commit identifiers are recorded in the superproject’s `review-log.md`.
