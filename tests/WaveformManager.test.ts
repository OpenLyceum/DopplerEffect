import { describe, expect, it } from "vitest";
import { WAVEFORM, type WaveformPoint } from "../src/DopplerEffectConstants.js";
import { WaveformManager } from "../src/doppler-effect/model/WaveformManager.js";

const TWO_PI = 2 * Math.PI;
const FREQUENCY = 4; // Hz

/** Model time of a graph point whose window ends at `now`. */
function pointTime(point: WaveformPoint, now: number): number {
  return now - WAVEFORM.TIME_WINDOW * (1 - point.t);
}

describe("WaveformManager", () => {
  it("samples on a uniform time grid whatever the step sizes", () => {
    const manager = new WaveformManager();
    manager.reset(0, 0);
    // Irregular frames, as when the browser stutters
    const steps = [1 / 60, 1 / 30, 1 / 144, 0.1, 1 / 60, 0.003];
    let time = 0;
    for (let i = 0; time < 3; i++) {
      time += steps[i % steps.length] ?? 0;
      manager.record(time, TWO_PI * FREQUENCY * time, null);
    }

    const data = manager.emittedWaveformData;
    expect(data.length).toBeGreaterThan(0);
    for (let i = 1; i < data.length; i++) {
      const spacing = ((data[i]?.t ?? 0) - (data[i - 1]?.t ?? 0)) * WAVEFORM.TIME_WINDOW;
      expect(spacing).toBeCloseTo(WAVEFORM.SAMPLE_INTERVAL, 9);
    }
    for (const point of data) {
      expect(point.y).toBeCloseTo(Math.cos(TWO_PI * FREQUENCY * pointTime(point, time)), 9);
    }
    expect(manager.observedWaveformData.every((point) => point.y === 0)).toBe(true);
  });

  it("only shows the last time window, ending at the present", () => {
    const manager = new WaveformManager();
    manager.reset(0, 0);
    let time = 0;
    while (time < 5) {
      time += 1 / 60;
      manager.record(time, 0, 0);
    }
    const data = manager.emittedWaveformData;
    expect(data[0]?.t ?? -1).toBeGreaterThanOrEqual(0);
    expect(data[data.length - 1]?.t ?? 0).toBeLessThanOrEqual(1);
    expect(data.length).toBe(Math.round(WAVEFORM.TIME_WINDOW / WAVEFORM.SAMPLE_INTERVAL));
  });

  it("drops the samples after the time it is rewound to", () => {
    const manager = new WaveformManager();
    manager.reset(0, 0);
    let time = 0;
    while (time < 3) {
      time += 1 / 60;
      manager.record(time, TWO_PI * FREQUENCY * time, null);
    }
    const rewound = 2.5;
    manager.rewindTo(rewound, TWO_PI * FREQUENCY * rewound, null);
    const data = manager.emittedWaveformData;
    const last = data[data.length - 1];
    expect(last === undefined ? Number.NaN : pointTime(last, rewound)).toBeLessThanOrEqual(rewound + 1e-9);
    expect(last?.t ?? 0).toBeGreaterThan(1 - WAVEFORM.SAMPLE_INTERVAL / WAVEFORM.TIME_WINDOW - 1e-9);
  });
});
