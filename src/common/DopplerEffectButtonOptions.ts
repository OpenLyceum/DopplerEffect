/**
 * DopplerEffectButtonOptions.ts
 *
 * Shared flat button appearance for the sim. Rectangular and round push buttons
 * default to SceneryStack's 3-D appearance; pass these options (or spread them
 * into nested button options) for a flat look everywhere.
 */

import type { TimeControlNodeOptions } from "scenerystack/scenery-phet";
import { ButtonNode } from "scenerystack/sun";
import DopplerEffectColors from "../DopplerEffectColors.js";

const FLAT_BUTTON_APPEARANCE_OPTIONS = {
  buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
} as const;

/** Options for ResetAllButton (extends RoundPushButton). */
export const FLAT_RESET_ALL_BUTTON_OPTIONS = FLAT_BUTTON_APPEARANCE_OPTIONS;

/**
 * Speed radio labels for TimeControlNode. SceneryStack Text defaults to black, which
 * is low-contrast on the sim's dark Default-mode panels.
 */
export const TIME_CONTROL_SPEED_RADIO_OPTIONS = {
  speedRadioButtonGroupOptions: {
    labelOptions: { fill: DopplerEffectColors.textColorProperty },
  },
} satisfies Pick<TimeControlNodeOptions, "speedRadioButtonGroupOptions">;
