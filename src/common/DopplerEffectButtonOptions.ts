/**
 * DopplerEffectButtonOptions.ts
 *
 * Shared flat button appearance for the sim. Rectangular and round push buttons
 * default to SceneryStack's 3-D appearance; pass these options (or spread them
 * into nested button options) for a flat look everywhere.
 *
 * Template-owned toolkit: each sim uses only some of these, so every export is tagged
 * `@public` to tell dead-code checkers (knip) that an unused one is not dead code.
 */

import type { TimeControlNodeOptions } from "scenerystack/scenery-phet";
import { ButtonNode } from "scenerystack/sun";
import DopplerEffectColors from "../DopplerEffectColors.js";

const FLAT_BUTTON_APPEARANCE_OPTIONS = {
  buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
} as const;

/** Options for ResetAllButton (extends RoundPushButton). @public */
export const FLAT_RESET_ALL_BUTTON_OPTIONS = { ...FLAT_BUTTON_APPEARANCE_OPTIONS } as const;

/**
 * Speed radio labels for TimeControlNode. SceneryStack Text defaults to black, which
 * is low-contrast on the sim's dark Default-mode panels.
 *
 * @public
 */
export const TIME_CONTROL_SPEED_RADIO_OPTIONS = {
  speedRadioButtonGroupOptions: {
    labelOptions: { fill: DopplerEffectColors.textColorProperty },
  },
} satisfies Pick<TimeControlNodeOptions, "speedRadioButtonGroupOptions">;
