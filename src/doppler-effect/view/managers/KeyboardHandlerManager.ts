/**
 * KeyboardHandlerManager.ts
 *
 * Manages keyboard input handlers for the Doppler Effect simulation.
 */

import { type Property, Vector2 } from "scenerystack";
import type { OneKeyStroke } from "scenerystack/scenery";
import { Scenario } from "../../model/DopplerEffectModel.js";
import {
  DopplerEffectHotkeyData,
  keyStrokeFromKeyboardEvent,
  SOUND_SPEED_DOWN_STROKE,
} from "../DopplerEffectHotkeyData.js";

/** Minimal numeric range shape (satisfied by RangeWithValue). */
type NumericRange = { min: number; max: number };

/**
 * Whether keyboard events originating from an editable/text control should be
 * ignored so that global shortcuts don't fire while the user is typing.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable === true;
}

/**
 * Callback type for keyboard handling events
 */
type KeyboardCallbacks = {
  onSourceSelected: () => void;
  onObserverSelected: () => void;
  onToggleTrails: () => void;
  onToggleHelp: () => void;
  onReset: () => void;
};

/**
 * Maps preset number keys to the scenario they load
 */
const SCENARIO_BY_KEY: Record<string, Scenario> = {
  "1": Scenario.SOURCE_APPROACHING,
  "2": Scenario.SOURCE_RECEDING,
  "3": Scenario.OBSERVER_APPROACHING,
  "4": Scenario.OBSERVER_RECEDING,
  "5": Scenario.SAME_DIRECTION,
  "6": Scenario.PERPENDICULAR,
  "0": Scenario.FREE_PLAY,
};

/**
 * Manager for handling keyboard input
 */
export class KeyboardHandlerManager {
  // Stored so the global listener can be removed and re-attachment is idempotent
  // (attaching twice would otherwise stack duplicate listeners that never get freed).
  private windowKeydownListener: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Attach keyboard event handlers
   *
   * @param callbacks - Callback functions for various keyboard actions
   * @param playProperty - Property for simulation play state
   * @param sourceVelocityProperty - Model property for source velocity
   * @param observerVelocityProperty - Model property for observer velocity
   * @param sourceMovingProperty - Model property for source moving state
   * @param observerMovingProperty - Model property for observer moving state
   * @param emittedFrequencyProperty - Model property for emitted frequency
   * @param soundSpeedProperty - Model property for sound speed
   * @param frequencyRange - Allowed range for the emitted frequency (Hz)
   * @param soundSpeedRange - Allowed range for the sound speed (m/s)
   * @param microphoneEnabledProperty - Model property for microphone state
   * @param selectedObjectProperty - Property indicating currently selected object
   * @param scenarioProperty - Property for the current scenario
   */
  public attachKeyboardHandlers(
    callbacks: KeyboardCallbacks,
    playProperty: Property<boolean>,
    sourceVelocityProperty: Property<Vector2>,
    observerVelocityProperty: Property<Vector2>,
    sourceMovingProperty: Property<boolean>,
    observerMovingProperty: Property<boolean>,
    emittedFrequencyProperty: Property<number>,
    soundSpeedProperty: Property<number>,
    frequencyRange: NumericRange,
    soundSpeedRange: NumericRange,
    microphoneEnabledProperty: Property<boolean>,
    selectedObjectProperty: Property<"source" | "observer">,
    scenarioProperty: Property<Scenario>,
  ): void {
    // Create a shared handler function for keydown events, dispatching to
    // focused helpers grouped by the kind of action each key triggers.
    const handleKeydown = (key: OneKeyStroke) => {
      this.handleObjectSelection(key, selectedObjectProperty, callbacks);

      // Arrow key movement is only available while the simulation is playing
      if (playProperty.value) {
        this.handleMovement(
          key,
          selectedObjectProperty,
          sourceVelocityProperty,
          observerVelocityProperty,
          sourceMovingProperty,
          observerMovingProperty,
        );
      }

      this.handleActions(key, callbacks, playProperty, microphoneEnabledProperty);
      this.handleScenarioPresets(key, scenarioProperty);
      this.handleAdjustments(key, emittedFrequencyProperty, soundSpeedProperty, frequencyRange, soundSpeedRange);
    };

    // A single global keydown listener drives the sim-wide shortcuts. Re-attaching
    // removes any previous listener first so handlers can never stack or leak.
    this.detachKeyboardHandlers();
    this.windowKeydownListener = (event: KeyboardEvent) => {
      // Don't hijack keys while the user is typing in an editable control.
      if (isEditableTarget(event.target)) {
        return;
      }
      // Shortcuts that have a help row are matched against DopplerEffectHotkeyData.
      // Space (play/pause) and R (reset) are not in that dialog; they stay literal.
      const stroke = keyStrokeFromKeyboardEvent(event);
      if (stroke) {
        handleKeydown(stroke);
      }
      const key = event.key.toLowerCase();
      if (key === " " || key === "r") {
        this.handleActions(key, callbacks, playProperty, microphoneEnabledProperty);
      }
    };
    window.addEventListener("keydown", this.windowKeydownListener);
  }

  /**
   * Remove the global keyboard listener, if one is attached.
   */
  public detachKeyboardHandlers(): void {
    if (this.windowKeydownListener) {
      window.removeEventListener("keydown", this.windowKeydownListener);
      this.windowKeydownListener = null;
    }
  }

  /**
   * Select the source or observer object
   */
  private handleObjectSelection(
    key: OneKeyStroke,
    selectedObjectProperty: Property<"source" | "observer">,
    callbacks: KeyboardCallbacks,
  ): void {
    if (DopplerEffectHotkeyData.selectSource.hasKeyStroke(key)) {
      selectedObjectProperty.value = "source";
      callbacks.onSourceSelected();
    } else if (DopplerEffectHotkeyData.selectObserver.hasKeyStroke(key)) {
      selectedObjectProperty.value = "observer";
      callbacks.onObserverSelected();
    }
  }

  /**
   * Apply arrow/WASD movement to the currently selected object
   */
  private handleMovement(
    key: OneKeyStroke,
    selectedObjectProperty: Property<"source" | "observer">,
    sourceVelocityProperty: Property<Vector2>,
    observerVelocityProperty: Property<Vector2>,
    sourceMovingProperty: Property<boolean>,
    observerMovingProperty: Property<boolean>,
  ): void {
    if (!DopplerEffectHotkeyData.move.hasKeyStroke(key)) {
      return;
    }

    // Determine which object to control
    const targetVelocity =
      selectedObjectProperty.value === "source" ? sourceVelocityProperty : observerVelocityProperty;
    const isMoving = selectedObjectProperty.value === "source" ? sourceMovingProperty : observerMovingProperty;

    // Set velocity based on key
    const velocity = new Vector2(0, 0);

    // "s" is reserved for selecting the source (see handleObjectSelection),
    // so downward movement uses ArrowDown only. "w"/"a"/"d" remain as WASD aliases
    // for the non-conflicting directions.
    if (key === "arrowLeft" || key === "a") {
      velocity.x = -100.0;
    } else if (key === "arrowRight" || key === "d") {
      velocity.x = 100.0;
    }

    if (key === "arrowUp" || key === "w") {
      velocity.y = 100.0;
    } else if (key === "arrowDown") {
      velocity.y = -100.0;
    }

    // Apply velocity if any keys were pressed
    if (velocity.magnitude > 0) {
      targetVelocity.value = velocity;
      isMoving.value = true;
    }
  }

  /**
   * Handle one-shot action keys: trail toggle, pause, reset, help, and microphone
   */
  private handleActions(
    key: OneKeyStroke | " ",
    callbacks: KeyboardCallbacks,
    playProperty: Property<boolean>,
    microphoneEnabledProperty: Property<boolean>,
  ): void {
    if (key !== " ") {
      if (DopplerEffectHotkeyData.toggleTrails.hasKeyStroke(key)) {
        callbacks.onToggleTrails();
      }
      if (key === "r") {
        callbacks.onReset();
      }
      if (DopplerEffectHotkeyData.toggleHelp.hasKeyStroke(key)) {
        callbacks.onToggleHelp();
      }
      if (DopplerEffectHotkeyData.toggleMicrophone.hasKeyStroke(key)) {
        microphoneEnabledProperty.value = !microphoneEnabledProperty.value;
      }
    }
    if (key === " ") {
      playProperty.value = !playProperty.value;
    }
  }

  /**
   * Load a preset scenario from a number key
   */
  private handleScenarioPresets(key: OneKeyStroke, scenarioProperty: Property<Scenario>): void {
    if (!DopplerEffectHotkeyData.scenarios.hasKeyStroke(key)) {
      return;
    }
    const scenario = SCENARIO_BY_KEY[key];
    if (scenario !== undefined) {
      scenarioProperty.value = scenario;
    }
  }

  /**
   * Adjust emitted frequency and sound speed, clamped to the same ranges the
   * sliders enforce so the keyboard can't drive values out of bounds.
   */
  private handleAdjustments(
    key: OneKeyStroke,
    emittedFrequencyProperty: Property<number>,
    soundSpeedProperty: Property<number>,
    frequencyRange: NumericRange,
    soundSpeedRange: NumericRange,
  ): void {
    const clamp = (value: number, range: NumericRange) => Math.max(range.min, Math.min(range.max, value));

    if (DopplerEffectHotkeyData.adjustFrequency.hasKeyStroke(key)) {
      if (key === "plus" || key === "equals") {
        emittedFrequencyProperty.value = clamp(emittedFrequencyProperty.value + 0.1, frequencyRange);
      } else if (key === "minus" || key === "shift+minus") {
        emittedFrequencyProperty.value = clamp(emittedFrequencyProperty.value - 0.1, frequencyRange);
      }
    }

    if (DopplerEffectHotkeyData.adjustSoundSpeed.hasKeyStroke(key)) {
      if (key === "period" || key === "shift+period") {
        soundSpeedProperty.value = clamp(soundSpeedProperty.value + 1.0, soundSpeedRange);
      } else if (key === SOUND_SPEED_DOWN_STROKE) {
        soundSpeedProperty.value = clamp(soundSpeedProperty.value - 1.0, soundSpeedRange);
      }
    }
  }
}
