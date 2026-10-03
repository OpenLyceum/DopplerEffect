import { Bounds2, Vector2 } from "scenerystack";
import { describe, expect, it } from "vitest";
import { PHYSICS, WAVE } from "../src/DopplerEffectConstants.js";
import { DopplerEffectModel, Scenario } from "../src/doppler-effect/model/DopplerEffectModel.js";

const DT = 1 / 60;

function run(model: DopplerEffectModel, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    model.step(DT);
  }
}

describe("DopplerEffectModel", () => {
  it("does not emit a burst of waves when the scenario changes mid-run", () => {
    const model = new DopplerEffectModel();
    run(model, 30);
    model.scenarioProperty.value = Scenario.SOURCE_APPROACHING;
    model.step(DT);
    expect(model.waves.length).toBeLessThanOrEqual(1);
  });

  it("does not keep a stale observed frequency after switching to a stationary scenario", () => {
    const model = new DopplerEffectModel();
    model.scenarioProperty.value = Scenario.SOURCE_APPROACHING;
    run(model, 15);
    expect(model.observedFrequencyProperty.value).toBeGreaterThan(PHYSICS.EMITTED_FREQ);
    model.scenarioProperty.value = Scenario.FREE_PLAY;
    model.step(DT);
    expect(model.observedFrequencyProperty.value).toBe(model.emittedFrequencyProperty.value);
  });

  it("clicks the microphone exactly once per wavefront wherever it sits", () => {
    // Sweep positions across one frame's front advance (c·dt ≈ 5.7 m): a static
    // tolerance band used to double-detect fronts landing just short of the mic.
    for (let offset = 0; offset < 6; offset++) {
      const model = new DopplerEffectModel();
      model.microphoneEnabledProperty.value = true;
      model.microphonePositionProperty.value = new Vector2(-500 + offset, 0);
      let detections = 0;
      for (let i = 0; i < 8 * 60; i++) {
        model.step(DT);
        if (model.waveDetectedProperty.value) {
          detections++;
        }
      }
      // Fronts emitted early enough to reach the mic (500 m - offset away) within 8 s
      expect(detections).toBe(Math.floor((8 - (500 - offset) / PHYSICS.SOUND_SPEED) * PHYSICS.EMITTED_FREQ));
    }
  });

  it("stops moving objects at the movement bounds", () => {
    const model = new DopplerEffectModel();
    model.movementBoundsProperty.value = new Bounds2(-2000, -1000, 2000, 1000);
    model.scenarioProperty.value = Scenario.SOURCE_APPROACHING;
    run(model, 60);
    expect(model.sourcePositionProperty.value.x).toBeCloseTo(2000);
    expect(model.sourceMovingProperty.value).toBe(false);
  });

  it("keeps objects subsonic when the sound speed is lowered", () => {
    const model = new DopplerEffectModel();
    model.sourceVelocityProperty.value = new Vector2(300, 0);
    model.soundSpeedProperty.value = model.soundSpeedRange.min;
    expect(model.sourceVelocityProperty.value.magnitude).toBeCloseTo(
      model.soundSpeedRange.min * PHYSICS.MAX_SPEED_FACTOR,
    );
  });

  it("bounds the wave history during long runs", () => {
    const model = new DopplerEffectModel();
    run(model, 120);
    // @ts-expect-error -- inspecting private state
    const historyLength: number = model.waveGenerator.waveHistory.length;
    // Restorable span (1000 recorded frames ≈ 16.7 s) plus one wave lifetime, at f₀
    const lifetime = WAVE.MAX_RADIUS / PHYSICS.SOUND_SPEED;
    expect(historyLength).toBeLessThanOrEqual(Math.ceil((1000 * DT + lifetime) * PHYSICS.EMITTED_FREQ) + 1);
  });

  it("undoes the first forward step with one step back", () => {
    const model = new DopplerEffectModel();
    model.playProperty.value = false;
    const start = model.sourcePositionProperty.value.copy();
    model.step(DT, true);
    expect(model.simulationTimeProperty.value).toBeGreaterThan(0);
    model.step(-DT, true);
    expect(model.simulationTimeProperty.value).toBe(0);
    expect(model.sourcePositionProperty.value.equals(start)).toBe(true);
  });

  it("steps backward without going below the recorded history", () => {
    const model = new DopplerEffectModel();
    model.playProperty.value = false;
    model.step(-DT, true);
    expect(model.simulationTimeProperty.value).toBe(0);
  });

  it("replays a gap-free wave train after stepping backward", () => {
    const model = new DopplerEffectModel();
    run(model, 5);
    const wavesBefore = model.waves.length;
    for (let i = 0; i < 60; i++) {
      model.step(-DT, true);
    }
    expect(model.simulationTimeProperty.value).toBeCloseTo(4, 5);
    run(model, 1);
    // Same wave count as the original run reached at t = 5 s: no gap, no duplicates
    expect(Math.abs(model.waves.length - wavesBefore)).toBeLessThanOrEqual(1);
  });
});
