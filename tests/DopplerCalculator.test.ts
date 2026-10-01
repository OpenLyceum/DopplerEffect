import { Vector2 } from "scenerystack";
import { describe, expect, it } from "vitest";
import { DopplerCalculator } from "../src/doppler-effect/model/DopplerCalculator.js";
import type { Wave } from "../src/doppler-effect/model/DopplerEffectModel.js";

const SOUND_SPEED = 343; // m/s
const SOURCE_FREQ = 1000; // Hz

/** Build a wave originating at `position` with the given source velocity. */
function makeWave(position: Vector2, sourceVelocity: Vector2, sourceFrequency = SOURCE_FREQ): Wave {
  return {
    position,
    radius: 0,
    birthTime: 0,
    sourceVelocity,
    sourceFrequency,
    phaseAtEmission: 0,
  };
}

describe("DopplerCalculator.calculateObservedFrequency", () => {
  const calc = new DopplerCalculator();

  it("returns the emitted frequency when source and observer are at rest", () => {
    const wave = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    const f = calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(0, 0), SOUND_SPEED);
    expect(f).toBeCloseTo(SOURCE_FREQ, 6);
  });

  it("returns the emitted frequency when the observer sits on the emission point", () => {
    const wave = makeWave(new Vector2(50, 0), new Vector2(30, 0));
    const f = calc.calculateObservedFrequency(wave, new Vector2(50, 0), new Vector2(10, 0), SOUND_SPEED);
    expect(f).toBe(SOURCE_FREQ);
  });

  it("raises the observed frequency when the source moves toward the observer", () => {
    // Source at origin moving in +x toward an observer on the +x axis.
    const sourceSpeed = 30;
    const wave = makeWave(new Vector2(0, 0), new Vector2(sourceSpeed, 0));
    const f = calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(0, 0), SOUND_SPEED);

    // f' = f * v / (v - v_s)
    const expected = (SOURCE_FREQ * SOUND_SPEED) / (SOUND_SPEED - sourceSpeed);
    expect(f).toBeCloseTo(expected, 6);
    expect(f).toBeGreaterThan(SOURCE_FREQ);
  });

  it("lowers the observed frequency when the source recedes from the observer", () => {
    const sourceSpeed = 30;
    const wave = makeWave(new Vector2(0, 0), new Vector2(-sourceSpeed, 0));
    const f = calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(0, 0), SOUND_SPEED);

    const expected = (SOURCE_FREQ * SOUND_SPEED) / (SOUND_SPEED + sourceSpeed);
    expect(f).toBeCloseTo(expected, 6);
    expect(f).toBeLessThan(SOURCE_FREQ);
  });

  it("lowers the observed frequency when the observer moves away from the source", () => {
    const observerSpeed = 30;
    const wave = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    // Observer on +x axis moving in +x (away from the source at origin).
    const f = calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(observerSpeed, 0), SOUND_SPEED);

    // f' = f * (v - v_o) / v
    const expected = (SOURCE_FREQ * (SOUND_SPEED - observerSpeed)) / SOUND_SPEED;
    expect(f).toBeCloseTo(expected, 6);
    expect(f).toBeLessThan(SOURCE_FREQ);
  });

  it("produces no shift for motion perpendicular to the line of sight", () => {
    // Observer on +x axis; source velocity is entirely in y, so its component
    // along the source→observer direction is zero.
    const wave = makeWave(new Vector2(0, 0), new Vector2(0, 50));
    const f = calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(0, 50), SOUND_SPEED);
    expect(f).toBeCloseTo(SOURCE_FREQ, 6);
  });

  it("treats a stationary observer as the zero-velocity case", () => {
    const wave = makeWave(new Vector2(0, 0), new Vector2(40, 0));
    const moving = calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(0, 0), SOUND_SPEED);
    const stationary = calc.calculateStationaryFrequency(wave, new Vector2(100, 0), SOUND_SPEED);
    expect(stationary).toBeCloseTo(moving, 6);
  });
});

describe("DopplerCalculator.findWavesAtObserver", () => {
  const calc = new DopplerCalculator();

  it("returns only waves whose radius has reached the observer", () => {
    const observer = new Vector2(100, 0);

    const reached = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    reached.radius = 120; // past the observer (distance 100)

    const notReached = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    notReached.radius = 50; // short of the observer

    const result = calc.findWavesAtObserver([reached, notReached], observer, SOUND_SPEED, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.wave).toBe(reached);
  });

  it("sorts arrived waves most-recent-arrival first", () => {
    const observer = new Vector2(100, 0);
    const simulationTime = 10;

    // Larger overshoot => arrived longer ago => earlier arrivalTime.
    const older = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    older.radius = 200; // overshoot 100

    const newer = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    newer.radius = 110; // overshoot 10

    const result = calc.findWavesAtObserver([older, newer], observer, SOUND_SPEED, simulationTime);
    expect(result.map((r) => r.wave)).toEqual([newer, older]);
    // arrivalTime = simulationTime - overshoot / soundSpeed
    expect(result[0]?.arrivalTime).toBeCloseTo(simulationTime - 10 / SOUND_SPEED, 6);
    expect(result[1]?.arrivalTime).toBeCloseTo(simulationTime - 100 / SOUND_SPEED, 6);
  });

  it("returns an empty array when no wave has reached the observer", () => {
    const observer = new Vector2(100, 0);
    const wave = makeWave(new Vector2(0, 0), new Vector2(0, 0));
    wave.radius = 10;
    expect(calc.findWavesAtObserver([wave], observer, SOUND_SPEED, 1)).toEqual([]);
  });
});
