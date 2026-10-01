/**
 * DopplerEffectHotkeyData.ts
 *
 * The sim-wide keyboard shortcuts, declared once so the help dialog and the
 * window key listener cannot drift. `keyStrokeFromKeyboardEvent` is the only
 * bridge from a DOM `KeyboardEvent.key` to these strokes.
 *
 * Comma is not a SceneryStack `OneKeyStroke` (it is absent from
 * EnglishStringToCodeMap), so the sound-speed-down stroke is a typed alias
 * checked only via `hasKeyStroke`. It is never handed to a `KeyboardListener`.
 */

import { HotkeyData, type OneKeyStroke } from "scenerystack/scenery";
import { StringManager } from "../../i18n/StringManager.js";

const strings = StringManager.getInstance().getInstructionsStrings();

/** Sound-speed decrease. Not a framework key name; see the file overview. */
export const SOUND_SPEED_DOWN_STROKE = "comma" as OneKeyStroke;

const REPO_NAME = "doppler-effect";

export const DopplerEffectHotkeyData = {
  selectSource: new HotkeyData({
    keys: ["s"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.objectSelection.selectSourceStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.objectSelection.selectSourceStringProperty,
  }),

  selectObserver: new HotkeyData({
    keys: ["o"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.objectSelection.selectObserverStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.objectSelection.selectObserverStringProperty,
  }),

  // "s" is select-source, so downward movement is ArrowDown only.
  move: new HotkeyData({
    keys: ["arrowLeft", "arrowRight", "arrowUp", "arrowDown", "a", "d", "w"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.objectSelection.moveObjectStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.objectSelection.moveObjectStringProperty,
  }),

  adjustFrequency: new HotkeyData({
    keys: ["plus", "equals", "minus", "shift+minus"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.adjust.frequencyStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.adjust.frequencyStringProperty,
  }),

  adjustSoundSpeed: new HotkeyData({
    keys: ["period", "shift+period", SOUND_SPEED_DOWN_STROKE],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.adjust.soundSpeedStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.adjust.soundSpeedStringProperty,
  }),

  scenarios: new HotkeyData({
    keys: ["0", "1", "2", "3", "4", "5", "6"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.scenarioKeys.freePlayStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.scenarioKeys.freePlayStringProperty,
  }),

  toggleTrails: new HotkeyData({
    keys: ["t"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.toggleMotionTrailsStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.toggleMotionTrailsStringProperty,
  }),

  toggleMicrophone: new HotkeyData({
    keys: ["m"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.toggleMicrophoneStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.toggleMicrophoneStringProperty,
  }),

  playPause: new HotkeyData({
    keys: ["space"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.controls.pauseResumeStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.controls.pauseResumeStringProperty,
  }),

  reset: new HotkeyData({
    keys: ["r"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.controls.resetStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.controls.resetStringProperty,
  }),

  toggleHelp: new HotkeyData({
    keys: ["h"],
    repoName: REPO_NAME,
    global: true,
    keyboardHelpDialogLabelStringProperty: strings.controls.toggleHelpStringProperty,
    keyboardHelpDialogPDOMLabelStringProperty: strings.a11y.controls.toggleHelpStringProperty,
  }),
} as const;

/**
 * DOM `KeyboardEvent.key` values that correspond to a stroke above, including
 * the shifted aliases the listener has always accepted (`=`, `_`, `>`, `<`).
 */
const EVENT_KEY_TO_STROKE: Record<string, OneKeyStroke> = {
  s: "s",
  S: "s",
  o: "o",
  O: "o",
  t: "t",
  T: "t",
  m: "m",
  M: "m",
  h: "h",
  H: "h",
  r: "r",
  R: "r",
  " ": "space",
  a: "a",
  A: "a",
  d: "d",
  D: "d",
  w: "w",
  W: "w",
  ArrowLeft: "arrowLeft",
  ArrowRight: "arrowRight",
  ArrowUp: "arrowUp",
  ArrowDown: "arrowDown",
  "+": "plus",
  "=": "equals",
  "-": "minus",
  ".": "period",
  ">": "shift+period",
  ",": SOUND_SPEED_DOWN_STROKE,
  "<": SOUND_SPEED_DOWN_STROKE,
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
};
EVENT_KEY_TO_STROKE["_"] = "shift+minus";

/** The HotkeyData stroke for this event, or null when it is not one of the shortcuts above. */
export function keyStrokeFromKeyboardEvent(event: KeyboardEvent): OneKeyStroke | null {
  return EVENT_KEY_TO_STROKE[event.key] ?? null;
}
