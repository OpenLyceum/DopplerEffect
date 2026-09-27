/**
 * DopplerEffectPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound to
 * DopplerEffectPreferencesModel Properties (initial values from query parameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import DopplerEffectColors from "../DopplerEffectColors.js";
import DopplerEffectNamespace from "../DopplerEffectNamespace.js";
import { StringManager } from "../i18n/StringManager.js";
import type { DopplerEffectPreferencesModel } from "./DopplerEffectPreferencesModel.js";

export class DopplerEffectPreferencesNode extends VBox {
  public constructor(preferencesModel: DopplerEffectPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // Preferences dialog is always white — use control-surface colors, not textColorProperty.
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: DopplerEffectColors.controlSurfaceTextColorProperty,
    });

    const microphoneEnabledCheckbox = new Checkbox(
      preferencesModel.microphoneEnabledProperty,
      new Text(prefStrings.microphoneEnabledStringProperty, {
        font: new PhetFont(14),
        fill: DopplerEffectColors.controlSurfaceTextColorProperty,
      }),
      {
        spacing: 8,
        checkboxColor: DopplerEffectColors.controlSurfaceTextColorProperty,
        checkboxColorBackground: DopplerEffectColors.controlSurfaceColorProperty,
        ...(tandem && { tandem: tandem.createTandem("microphoneEnabledCheckbox") }),
      },
    );

    super({
      align: "left",
      spacing: 12,
      children: [header, microphoneEnabledCheckbox],
    });
  }
}

DopplerEffectNamespace.register("DopplerEffectPreferencesNode", DopplerEffectPreferencesNode);
