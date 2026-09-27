/**
 * Fleet-standard memory-leak regression suite.
 * DopplerCalculator is a pure helper — the dispose/GC unit for this sim's model layer.
 */

import { Vector2 } from "scenerystack";
import { describe, expect, it } from "vitest";
import { TimeModel } from "../src/common/TimeModel.js";
import { DopplerCalculator } from "../src/doppler-effect/model/DopplerCalculator.js";
import type { Wave } from "../src/doppler-effect/model/DopplerEffectModel.js";
import { describeDisposalLeaks, forceGC } from "./helpers/memoryLeak.js";

function createAndDropCalculator(): WeakRef<object> {
  const calc = new DopplerCalculator();
  const wave: Wave = {
    position: new Vector2(0, 0),
    radius: 0,
    birthTime: 0,
    sourceVelocity: new Vector2(0, 0),
    sourceFrequency: 1000,
    phaseAtEmission: 0,
  };
  calc.calculateObservedFrequency(wave, new Vector2(100, 0), new Vector2(0, 0), 343);
  return new WeakRef<object>(calc);
}

describe("Memory leak regression", () => {
  it("DopplerCalculator is collected after drop", async () => {
    const ref = createAndDropCalculator();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("repeated create/drop cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDropCalculator());
    }
    await forceGC(refs);
    expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
  });
});

describeDisposalLeaks([{ name: "TimeModel", create: () => new TimeModel(), idempotentDispose: true }]);
