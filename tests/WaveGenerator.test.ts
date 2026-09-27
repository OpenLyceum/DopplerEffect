import type { ObservableArray } from "scenerystack";
import { Vector2 } from "scenerystack";
import { beforeEach, describe, expect, it } from "vitest";
import type { Wave } from "../src/doppler-effect/model/DopplerEffectModel.js";
import { WaveGenerator } from "../src/doppler-effect/model/WaveGenerator.js";

/**
 * Minimal array-backed stand-in for the subset of ObservableArray that
 * WaveGenerator actually uses (add / length / get / remove / clear).
 */
function makeFakeWaveArray() {
  const items: Wave[] = [];
  const fake = {
    items,
    add: (wave: Wave) => {
      items.push(wave);
    },
    remove: (wave: Wave) => {
      const i = items.indexOf(wave);
      if (i >= 0) {
        items.splice(i, 1);
      }
    },
    get: (i: number) => items[i],
    clear: () => {
      items.length = 0;
    },
    get length() {
      return items.length;
    },
  };
  return fake as typeof fake & ObservableArray<Wave>;
}

describe("WaveGenerator.generateWaves", () => {
  let time: number;
  let waves: ReturnType<typeof makeFakeWaveArray>;
  let generator: WaveGenerator;
  const frequency = 10; // Hz -> wave interval 0.1 s

  beforeEach(() => {
    time = 0;
    waves = makeFakeWaveArray();
    generator = new WaveGenerator(
      waves,
      () => time,
      () => new Vector2(0, 0),
      () => new Vector2(0, 0),
      () => frequency,
      () => 343,
      () => 0,
    );
  });

  it("does not emit a wave before one full interval has elapsed", () => {
    time = 0.05; // < 0.1
    generator.generateWaves();
    expect(waves.length).toBe(0);
  });

  it("emits a wave once the interval is exceeded", () => {
    time = 0.11; // > 0.1
    generator.generateWaves();
    expect(waves.length).toBe(1);
    expect(waves.get(0)?.birthTime).toBeCloseTo(0.11, 6);
    expect(waves.get(0)?.sourceFrequency).toBe(frequency);
  });

  it("emits at most one wave per call and respects the cadence", () => {
    // Step time forward in small increments and emit on each frame.
    for (let i = 1; i <= 30; i++) {
      time = i * 0.0167; // ~60 fps, total ~0.5 s
      generator.generateWaves();
    }
    // Over ~0.5 s at 10 Hz we expect roughly 5 waves (one per 0.1 s interval).
    expect(waves.length).toBeGreaterThanOrEqual(4);
    expect(waves.length).toBeLessThanOrEqual(6);
  });

  it("clears all waves and emission state on reset", () => {
    time = 0.5;
    generator.generateWaves();
    expect(waves.length).toBeGreaterThan(0);
    generator.reset();
    expect(waves.length).toBe(0);
  });

  it("emits every elapsed interval when a single frame spans several intervals", () => {
    // A 0.55 s frame at 10 Hz (0.1 s interval) covers 5 whole intervals.
    time = 0.55;
    generator.generateWaves();
    expect(waves.length).toBe(5);
  });

  it("keeps a drift-free cadence across many small frames", () => {
    // Advance in ~60 fps steps for 5 s; at 10 Hz we expect ~50 waves, and the
    // emission clock must not lag behind by more than one interval.
    const steps = Math.round(5 / (1 / 60));
    for (let i = 1; i <= steps; i++) {
      time = i / 60;
      generator.generateWaves();
    }
    // 5 s at 10 Hz -> 50 intervals; allow a one-wave boundary tolerance.
    expect(waves.length).toBeGreaterThanOrEqual(49);
    expect(waves.length).toBeLessThanOrEqual(50);
  });
});

describe("WaveGenerator.detectWaveAt", () => {
  const soundSpeed = 343;
  // ~60 fps step: front advances soundSpeed * dt ~= 5.7 m, larger than the
  // legacy ±2 m detection band — the case that previously failed to detect.
  const dt = 1 / 60;

  function makeGenerator(waves: ReturnType<typeof makeFakeWaveArray>, time: () => number) {
    return new WaveGenerator(
      waves,
      time,
      () => new Vector2(0, 0),
      () => new Vector2(0, 0),
      () => 10,
      () => soundSpeed,
      () => 0,
    );
  }

  it("detects a fast-expanding front that steps over the old tolerance band", () => {
    let time = 0;
    const waves = makeFakeWaveArray();
    const generator = makeGenerator(waves, () => time);

    // Wave emitted at origin; microphone 100 m away.
    const micPosition = new Vector2(100, 0);
    waves.add({
      position: new Vector2(0, 0),
      radius: 0,
      birthTime: 0,
      sourceVelocity: new Vector2(0, 0),
      sourceFrequency: 10,
      phaseAtEmission: 0,
    });

    // Advance the front frame by frame; it should be detected on exactly the
    // frame where it crosses 100 m, never skipping past it.
    let detected = false;
    for (let i = 1; i <= 1200; i++) {
      time = i * dt;
      const wave = waves.get(0);
      if (wave === undefined) {
        throw new Error("test fixture: expected wave at index 0");
      }
      wave.radius += dt * soundSpeed;
      if (generator.detectWaveAt(micPosition, time, dt)) {
        detected = true;
        break;
      }
    }
    expect(detected).toBe(true);
  });

  it("does not detect before the front reaches the position", () => {
    const time = 0.1;
    const waves = makeFakeWaveArray();
    const generator = makeGenerator(waves, () => time);

    waves.add({
      position: new Vector2(0, 0),
      radius: 10, // front at 10 m
      birthTime: 0,
      sourceVelocity: new Vector2(0, 0),
      sourceFrequency: 10,
      phaseAtEmission: 0,
    });

    // Microphone well beyond the front and beyond the per-step advance.
    expect(generator.detectWaveAt(new Vector2(100, 0), time, dt)).toBe(false);
  });

  it("respects the detection cooldown", () => {
    let time = 0;
    const waves = makeFakeWaveArray();
    const generator = makeGenerator(waves, () => time);

    const micPosition = new Vector2(50, 0);
    waves.add({
      position: new Vector2(0, 0),
      radius: 50, // sitting exactly on the microphone
      birthTime: 0,
      sourceVelocity: new Vector2(0, 0),
      sourceFrequency: 10,
      phaseAtEmission: 0,
    });

    time = 0.02; // beyond the 0.01 s cooldown from the initial 0
    expect(generator.detectWaveAt(micPosition, time, dt)).toBe(true);
    // Within the 0.01 s cooldown of the previous detection -> suppressed.
    time = 0.025;
    expect(generator.detectWaveAt(micPosition, time, dt)).toBe(false);
  });
});

describe("WaveGenerator.updateWaves", () => {
  it("expands wave radius by soundSpeed * dt", () => {
    let time = 0;
    const waves = makeFakeWaveArray();
    const soundSpeed = 343;
    const generator = new WaveGenerator(
      waves,
      () => time,
      () => new Vector2(0, 0),
      () => new Vector2(0, 0),
      () => 10,
      () => soundSpeed,
      () => 0,
    );

    time = 0.2;
    generator.generateWaves();
    expect(waves.length).toBe(1);

    generator.updateWaves(time, 0.1);
    expect(waves.get(0)?.radius).toBeCloseTo(soundSpeed * 0.1, 6);
  });
});
