/**
 * DopplerEffectPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in dopplerEffectQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import DopplerEffectNamespace from "../DopplerEffectNamespace.js";
import dopplerEffectQueryParameters from "./dopplerEffectQueryParameters.js";

export class DopplerEffectPreferencesModel {
  public readonly microphoneEnabledProperty: BooleanProperty;

  /** Whether the sim's single-key shortcuts are active (WCAG 2.1.4 lets users turn them off). */
  public readonly singleKeyShortcutsEnabledProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.microphoneEnabledProperty = new BooleanProperty(
      dopplerEffectQueryParameters.microphoneEnabled,
      tandem ? { tandem: tandem.createTandem("microphoneEnabledProperty") } : undefined,
    );
    this.singleKeyShortcutsEnabledProperty = new BooleanProperty(
      dopplerEffectQueryParameters.singleKeyShortcuts,
      tandem ? { tandem: tandem.createTandem("singleKeyShortcutsEnabledProperty") } : undefined,
    );
  }

  public reset(): void {
    this.microphoneEnabledProperty.reset();
    this.singleKeyShortcutsEnabledProperty.reset();
  }
}

DopplerEffectNamespace.register("DopplerEffectPreferencesModel", DopplerEffectPreferencesModel);
