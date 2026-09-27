/**
 * Fleet-standard memory-leak regression suite.
 * DopplerCalculator is a pure helper — the dispose/GC unit for this sim's model layer.
 */

import { Vector2 } from "scenerystack";
import { describe, expect, it } from "vitest";
import { DopplerCalculator } from "../src/doppler-effect/model/DopplerCalculator.js";
import type { Wave } from "../src/doppler-effect/model/DopplerEffectModel.js";

/**
 * Force garbage collection with multiple passes. When `earlyExitRefs` is supplied
 * the loop bails as soon as every referenced object is confirmed collected. The
 * setTimeout(0) yield after a live deref() avoids the WeakRef macrotask-liveness pin.
 * Without early-exit refs the loop always runs all passes, which on a slow `gc()`
 * can exceed the Vitest testTimeout — always pass refs when you have them.
 */
async function forceGC(earlyExitRefs?: WeakRef<object> | readonly WeakRef<object>[]): Promise<void> {
  const refs = earlyExitRefs === undefined ? [] : Array.isArray(earlyExitRefs) ? earlyExitRefs : [earlyExitRefs];
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (refs.length > 0 && refs.every((ref) => ref.deref() === undefined)) {
      return;
    }
    if (refs.length > 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

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
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

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
