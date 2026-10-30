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
    birthTravel: 0,
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
});

describe("DopplerCalculator.findObservedSignal", () => {
  const calc = new DopplerCalculator();
  const TWO_PI = 2 * Math.PI;

  /** Front n of a train from `origin`, with the given radius; it carries phase 2πn. */
  function makeFront(n: number, origin: Vector2, radius: number): Wave {
    const wave = makeWave(origin, new Vector2(0, 0));
    wave.radius = radius;
    wave.phaseAtEmission = TWO_PI * n;
    return wave;
  }

  it("returns null when no front has reached the observer", () => {
    const fronts = [makeFront(1, new Vector2(0, 0), 10)];
    const nextFront = makeFront(2, new Vector2(0, 0), -5);
    expect(calc.findObservedSignal(fronts, new Vector2(100, 0), nextFront)).toBeNull();
  });

  it("picks the newest passed front and interpolates the phase toward the following one", () => {
    const observer = new Vector2(100, 0);
    const older = makeFront(1, new Vector2(0, 0), 130); // passed 30 m ago
    const newer = makeFront(2, new Vector2(0, 0), 110); // passed 10 m ago
    const coming = makeFront(3, new Vector2(0, 0), 70); // 30 m short
    const nextFront = makeFront(4, new Vector2(0, 0), -10);

    const signal = calc.findObservedSignal([older, newer, coming], observer, nextFront);
    expect(signal?.wave).toBe(newer);
    expect(signal?.phase).toBeCloseTo(TWO_PI * (2 + 10 / (10 + 30)), 9);
  });

  it("uses the not-yet-emitted front to close the gap behind the newest front", () => {
    const observer = new Vector2(100, 0);
    const newest = makeFront(5, new Vector2(0, 0), 120); // passed 20 m ago
    const nextFront = makeFront(6, new Vector2(0, 0), -60); // 160 m short

    const signal = calc.findObservedSignal([newest], observer, nextFront);
    expect(signal?.wave).toBe(newest);
    expect(signal?.phase).toBeCloseTo(TWO_PI * (5 + 20 / (20 + 160)), 9);
  });

  it("advances the phase faster for an approaching source (Doppler-shifted rate)", () => {
    // Fronts emitted every 1/f from a source moving at v toward an observer far ahead:
    // they are spaced (c − v)/f apart, so the observer hears f·c/(c − v).
    const f = 4;
    const v = 100;
    const observer = new Vector2(10000, 0);
    const phaseAt = (t: number): number => {
      const fronts: Wave[] = [];
      for (let n = 0; n * (1 / f) <= t; n++) {
        const birth = n / f;
        fronts.push(makeFront(n, new Vector2(v * birth, 0), SOUND_SPEED * (t - birth)));
      }
      const nextBirth = fronts.length / f;
      const nextFront = makeFront(fronts.length, new Vector2(v * t, 0), SOUND_SPEED * (t - nextBirth));
      return calc.findObservedSignal(fronts, observer, nextFront)?.phase ?? Number.NaN;
    };
    const dt = 0.5;
    const rate = (phaseAt(40 + dt) - phaseAt(40)) / TWO_PI / dt; // cycles per second
    expect(rate).toBeCloseTo((f * SOUND_SPEED) / (SOUND_SPEED - v), 6);
  });
});
