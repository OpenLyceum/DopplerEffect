/**
 * DopplerEffectScreenSummaryContent.ts
 *
 * Accessible screen summary (SceneryStack Interactive Description) for the Doppler
 * Effect screen. Describes the play area and controls, gives an interaction hint,
 * and exposes a LIVE "current details" paragraph derived from the model (emitted
 * and observed frequencies and the play/pause state).
 *
 * Follows the OpenLyceum accessibility convention; see the canonical
 * SceneryStackTemplate/DopplerEffectScreenSummaryContent.ts.
 */

import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { DopplerEffectModel } from "../model/DopplerEffectModel.js";

export class DopplerEffectScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: DopplerEffectModel) {
    const a11y = StringManager.getInstance().getA11yStrings();

    const currentDetailsProperty = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        a11y.playingLabelStringProperty,
        a11y.pausedLabelStringProperty,
        model.emittedFrequencyProperty,
        model.observedFrequencyProperty,
        model.playProperty,
      ],
      (template, playingLabel, pausedLabel, emitted, observed, playing) =>
        StringUtils.fillIn(template, {
          emitted: toFixed(emitted, 1),
          observed: toFixed(observed, 1),
          state: playing ? playingLabel : pausedLabel,
        }),
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetailsProperty,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
