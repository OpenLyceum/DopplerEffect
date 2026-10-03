/**
 * Fleet-standard memory-leak regression suite.
 * DopplerCalculator is a pure helper — the dispose/GC unit for this sim's model layer.
 */

import { ModelViewTransform2, Node, Vector2 } from "scenerystack";
import { describe, expect, it } from "vitest";
import { DopplerCalculator } from "../src/doppler-effect/model/DopplerCalculator.js";
import type { Wave } from "../src/doppler-effect/model/DopplerEffectModel.js";
import { WaveManager } from "../src/doppler-effect/view/managers/WaveManager.js";
import { describeDisposalLeaks, forceGC } from "./helpers/memoryLeak.js";

function createAndDropCalculator(): WeakRef<object> {
  const calc = new DopplerCalculator();
  const wave: Wave = {
    position: new Vector2(0, 0),
    radius: 0,
    birthTime: 0,
    birthTravel: 0,
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

// Wave nodes are the one thing created and removed for the whole run. Each is
// stroked with the long-lived wave color Property; scenery only links that
// Property from a displayed node's drawables, so a removed node must still be
// collectable. This guards against a future change that links it directly.
function addAndRemoveWaveNode(manager: WaveManager, layer: Node): WeakRef<object> {
  const wave: Wave = {
    position: new Vector2(0, 0),
    radius: 1,
    birthTime: 0,
    birthTravel: 0,
    sourceVelocity: new Vector2(0, 0),
    sourceFrequency: 1,
    phaseAtEmission: 0,
  };
  manager.addWaveNode(wave);
  const node = layer.children[layer.children.length - 1];
  expect(node).toBeDefined();
  const ref = new WeakRef<object>(node as Node);
  manager.removeWaveNode(wave);
  return ref;
}

describe("WaveManager", () => {
  it("removed wave nodes are collected", async () => {
    const layer = new Node();
    const manager = new WaveManager(layer, ModelViewTransform2.createIdentity());
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 5; i++) {
      refs.push(addAndRemoveWaveNode(manager, layer));
    }
    await forceGC(refs);
    expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
  });
});

// No class in src/ has a dispose(): every node and model lives as long as the sim
// (see doc/implementation-notes.md, "Disposal conventions"). Add cases here when a
// disposable object is introduced.
describeDisposalLeaks([]);
