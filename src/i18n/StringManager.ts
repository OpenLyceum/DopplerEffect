/**
 * StringManager.ts
 *
 * Centralizes string management for the simulation.
 * Provides access to localized strings for all components.
 */

import type { ReadOnlyProperty } from "scenerystack/axon";
import { LocalizedString } from "scenerystack/chipper";
import stringsEn from "./strings_en.json";
import stringsEs from "./strings_es.json";
import stringsFr from "./strings_fr.json";

// ── Compile-time key-parity check ─────────────────────────────────────────────
// English is the canonical shape; every other locale must match it exactly.
// TypeScript errors here if any locale file is missing (or adds) a key relative to
// English. Add one `satisfies` line per new locale so the check stays exhaustive.
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEs satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsEs);

// ── Build the reactive string property tree ───────────────────────────────────
const stringProperties = LocalizedString.getNestedStringProperties({
  en: stringsEn,
  fr: stringsFr,
  es: stringsEs,
});

export class StringManager {
  private static instance: StringManager | null = null;

  private constructor() {
    // Private — obtain via getInstance()
  }

  public static getInstance(): StringManager {
    if (StringManager.instance === null) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  public getStatusTextStrings() {
    return {
      emittedFrequencyPatternStringProperty: stringProperties.graphs.emittedFrequencyStringProperty,
      observedFrequencyPatternStringProperty: stringProperties.graphs.observedFrequencyStringProperty,
      selectedObjectPatternStringProperty: stringProperties.selectedObjectStringProperty,
      blueshiftStringProperty: stringProperties.shift.blueshiftStringProperty,
      redshiftStringProperty: stringProperties.shift.redshiftStringProperty,
      sourceStringProperty: stringProperties.sourceStringProperty,
      observerStringProperty: stringProperties.observerStringProperty,
    };
  }

  public getControlPanelStrings() {
    return {
      valuesStringProperty: stringProperties.controls.valuesStringProperty,
      velocityArrowsStringProperty: stringProperties.controls.velocityArrowsStringProperty,
      lineOfSightStringProperty: stringProperties.controls.lineOfSightStringProperty,
      soundSpeedStringProperty: stringProperties.controls.soundSpeedStringProperty,
      frequencyStringProperty: stringProperties.controls.frequencyStringProperty,
      motionTrailsStringProperty: stringProperties.controls.motionTrailsStringProperty,
      gridStringProperty: stringProperties.controls.gridStringProperty,
      metersPerSecondStringProperty: stringProperties.units.metersPerSecondStringProperty,
      hertzStringProperty: stringProperties.units.hertzStringProperty,
      microphoneClicksStringProperty: stringProperties.controls.microphoneClicksStringProperty,
    };
  }

  public getGraphDisplayStrings() {
    return {
      emittedSoundStringProperty: stringProperties.graphs.emittedSoundStringProperty,
      observedSoundStringProperty: stringProperties.graphs.observedSoundStringProperty,
    };
  }

  public getInstructionsStrings() {
    return {
      titleStringProperty: stringProperties.titleStringProperty,
      dragAndDropStringProperty: stringProperties.help.dragAndDropStringProperty,
      keyboardControlsStringProperty: stringProperties.help.keyboardControlsStringProperty,
      sections: {
        navigationStringProperty: stringProperties.help.sections.navigationStringProperty,
        simulationControlsStringProperty: stringProperties.help.sections.simulationControlsStringProperty,
        parameterAdjustmentStringProperty: stringProperties.help.sections.parameterAdjustmentStringProperty,
        scenariosStringProperty: stringProperties.help.sections.scenariosStringProperty,
        visibilityOptionsStringProperty: stringProperties.help.sections.visibilityOptionsStringProperty,
      },
      objectSelection: {
        selectSourceStringProperty: stringProperties.help.objectSelection.selectSourceStringProperty,
        selectObserverStringProperty: stringProperties.help.objectSelection.selectObserverStringProperty,
        moveObjectStringProperty: stringProperties.help.objectSelection.moveObjectStringProperty,
      },
      controls: {
        pauseResumeStringProperty: stringProperties.help.controls.pauseResumeStringProperty,
        resetStringProperty: stringProperties.help.controls.resetStringProperty,
        toggleHelpStringProperty: stringProperties.help.controls.toggleHelpStringProperty,
      },
      adjust: {
        frequencyStringProperty: stringProperties.help.adjust.frequencyStringProperty,
        soundSpeedStringProperty: stringProperties.help.adjust.soundSpeedStringProperty,
      },
      scenarioKeys: {
        freePlayStringProperty: stringProperties.help.scenarioKeys.freePlayStringProperty,
        sourceApproachingStringProperty: stringProperties.help.scenarioKeys.sourceApproachingStringProperty,
        sourceRecedingStringProperty: stringProperties.help.scenarioKeys.sourceRecedingStringProperty,
        observerApproachingStringProperty: stringProperties.help.scenarioKeys.observerApproachingStringProperty,
        observerRecedingStringProperty: stringProperties.help.scenarioKeys.observerRecedingStringProperty,
        sameDirectionStringProperty: stringProperties.help.scenarioKeys.sameDirectionStringProperty,
        perpendicularStringProperty: stringProperties.help.scenarioKeys.perpendicularStringProperty,
      },
      toggleMotionTrailsStringProperty: stringProperties.help.toggleMotionTrailsStringProperty,
      toggleMicrophoneStringProperty: stringProperties.help.toggleMicrophoneStringProperty,
      dragMicrophoneStringProperty: stringProperties.help.dragMicrophoneStringProperty,
      a11y: {
        objectSelection: {
          selectSourceStringProperty: stringProperties.help.a11y.objectSelection.selectSourceStringProperty,
          selectObserverStringProperty: stringProperties.help.a11y.objectSelection.selectObserverStringProperty,
          moveObjectStringProperty: stringProperties.help.a11y.objectSelection.moveObjectStringProperty,
        },
        controls: {
          pauseResumeStringProperty: stringProperties.help.a11y.controls.pauseResumeStringProperty,
          resetStringProperty: stringProperties.help.a11y.controls.resetStringProperty,
          toggleHelpStringProperty: stringProperties.help.a11y.controls.toggleHelpStringProperty,
        },
        adjust: {
          frequencyStringProperty: stringProperties.help.a11y.adjust.frequencyStringProperty,
          soundSpeedStringProperty: stringProperties.help.a11y.adjust.soundSpeedStringProperty,
        },
        scenarioKeys: {
          freePlayStringProperty: stringProperties.help.a11y.scenarioKeys.freePlayStringProperty,
          sourceApproachingStringProperty: stringProperties.help.a11y.scenarioKeys.sourceApproachingStringProperty,
          sourceRecedingStringProperty: stringProperties.help.a11y.scenarioKeys.sourceRecedingStringProperty,
          observerApproachingStringProperty: stringProperties.help.a11y.scenarioKeys.observerApproachingStringProperty,
          observerRecedingStringProperty: stringProperties.help.a11y.scenarioKeys.observerRecedingStringProperty,
          sameDirectionStringProperty: stringProperties.help.a11y.scenarioKeys.sameDirectionStringProperty,
          perpendicularStringProperty: stringProperties.help.a11y.scenarioKeys.perpendicularStringProperty,
        },
        toggleMotionTrailsStringProperty: stringProperties.help.a11y.toggleMotionTrailsStringProperty,
        toggleMicrophoneStringProperty: stringProperties.help.a11y.toggleMicrophoneStringProperty,
      },
    };
  }

  public getTitleStringProperty(): ReadOnlyProperty<string> {
    return stringProperties.titleStringProperty;
  }

  /**
   * Accessibility (Interactive Description) StringProperties: the screen-summary
   * regions and the live current-details template. See the shared OpenLyceum
   * ACCESSIBILITY.md convention.
   */
  public getA11yStrings() {
    return stringProperties.a11y;
  }

  /** Simulation-specific preference labels shown in Preferences → Simulation. */
  public getPreferences() {
    return stringProperties.preferences;
  }

  public getScenarioStrings() {
    return {
      freePlayStringProperty: stringProperties.scenarios.freePlayStringProperty,
      sourceApproachingStringProperty: stringProperties.scenarios.sourceApproachingStringProperty,
      sourceRecedingStringProperty: stringProperties.scenarios.sourceRecedingStringProperty,
      observerApproachingStringProperty: stringProperties.scenarios.observerApproachingStringProperty,
      observerRecedingStringProperty: stringProperties.scenarios.observerRecedingStringProperty,
      sameDirectionStringProperty: stringProperties.scenarios.sameDirectionStringProperty,
      perpendicularStringProperty: stringProperties.scenarios.perpendicularStringProperty,
    };
  }

  public getObjectStrings() {
    return {
      sourceStringProperty: stringProperties.sourceStringProperty,
      observerStringProperty: stringProperties.observerStringProperty,
    };
  }

  public getAllStringProperties() {
    return stringProperties;
  }
}
