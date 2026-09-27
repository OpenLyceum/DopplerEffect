/**
 * DopplerEffectPreferencesModel.ts
 *
 * Sim-specific preferences (Preferences → Simulation) for Doppler Effect. Each
 * preference Property takes its initial value from the corresponding query
 * parameter in dopplerEffectQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import DopplerEffectNamespace from "../DopplerEffectNamespace.js";
import dopplerEffectQueryParameters from "./dopplerEffectQueryParameters.js";

export class DopplerEffectPreferencesModel {
  public readonly microphoneEnabledProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.microphoneEnabledProperty = new BooleanProperty(
      dopplerEffectQueryParameters.microphoneEnabled,
      tandem ? { tandem: tandem.createTandem("microphoneEnabledProperty") } : undefined,
    );
  }

  public reset(): void {
    this.microphoneEnabledProperty.reset();
  }
}

DopplerEffectNamespace.register("DopplerEffectPreferencesModel", DopplerEffectPreferencesModel);
