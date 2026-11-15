/**
 * Fleet-standard memory-leak regression suite.
 * No class in src/ has a dispose(), so the sim-specific suites below use create/drop + forceGC:
 * DopplerCalculator, DopplerEffectModel (with and without preferences) and WaveManager wave nodes.
 */

import { ModelViewTransform2, Node, Vector2 } from "scenerystack";
import { describe, expect, it } from "vitest";
import { DopplerCalculator } from "../src/doppler-effect/model/DopplerCalculator.js";
import { DopplerEffectModel, Scenario, type Wave } from "../src/doppler-effect/model/DopplerEffectModel.js";
import { WaveManager } from "../src/doppler-effect/view/managers/WaveManager.js";
import { DopplerEffectPreferencesModel } from "../src/preferences/DopplerEffectPreferencesModel.js";
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

// DopplerEffectModel has no dispose(): every Property, observable array, manager and the
// listeners it adds to its own Properties are owned by the model, so dropping the model
// must release all of it. The model is stepped long enough to emit waves and fill the
// position / waveform histories before being dropped. Preferences are created inside the
// helper (their listeners close over the model, so a long-lived preferences object would
// pin it — in the sim both live for the whole run).
const DT = 1 / 60;

function createSteppedModel(preferences?: DopplerEffectPreferencesModel): DopplerEffectModel {
  const model = new DopplerEffectModel(preferences);
  model.scenarioProperty.value = Scenario.SOURCE_APPROACHING;
  for (let i = 0; i < 120; i++) {
    model.step(DT);
  }
  return model;
}

function createAndDropModel(): WeakRef<object> {
  return new WeakRef<object>(createSteppedModel());
}

function createAndDropModelWithPreferences(): WeakRef<object> {
  const preferences = new DopplerEffectPreferencesModel();
  const model = createSteppedModel(preferences);
  preferences.microphoneEnabledProperty.value = !preferences.microphoneEnabledProperty.value;
  return new WeakRef<object>(model);
}

// The wave is only referenced inside this helper, so after reset() the model is its sole
// possible holder (waves array, WaveGenerator history).
function resetAndTrackFirstWave(model: DopplerEffectModel): WeakRef<object> {
  const wave = model.waves[0];
  expect(wave).toBeDefined();
  const ref = new WeakRef<object>(wave as Wave);
  model.reset();
  return ref;
}

describe("DopplerEffectModel", () => {
  it("is collected after drop", async () => {
    const ref = createAndDropModel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("is collected after drop together with its preferences", async () => {
    const ref = createAndDropModelWithPreferences();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("repeated create/drop cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDropModel());
      refs.push(createAndDropModelWithPreferences());
    }
    await forceGC(refs);
    expect(refs.filter((r) => r.deref() !== undefined).length).toBe(0);
  });

  it("reset() after stepping does not retain dropped waves", async () => {
    const model = createSteppedModel();
    const ref = resetAndTrackFirstWave(model);
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
    expect(model.waves.length).toBe(0);
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

// No class in src/ has a dispose() (see doc/implementation-notes.md, "Disposal
// conventions"), so there is nothing to list here; DopplerCalculator, DopplerEffectModel
// and WaveManager coverage is above. Add cases here when a disposable object is introduced.
describeDisposalLeaks([]);
