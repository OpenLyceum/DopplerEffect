/**
 * DopplerEffectScreenSummaryContent.ts
 *
 * Accessible screen summary (SceneryStack Interactive Description) for the Doppler
 * Effect screen. Describes the play area and controls, gives an interaction hint,
 * and exposes a LIVE "current details" paragraph derived from the model (emitted
 * and observed frequencies, the play/pause state, and the source and observer
 * speeds and separation that the Values overlay shows).
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
        model.sourceVelocityProperty,
        model.observerVelocityProperty,
        model.sourceObserverDistanceProperty,
      ],
      // The speeds and separation are what the Values overlay shows on screen.
      (template, playingLabel, pausedLabel, emitted, observed, playing, sourceVelocity, observerVelocity, distance) =>
        StringUtils.fillIn(template, {
          emitted: toFixed(emitted, 1),
          observed: toFixed(observed, 1),
          state: playing ? playingLabel : pausedLabel,
          sourceSpeed: toFixed(sourceVelocity.magnitude, 0),
          observerSpeed: toFixed(observerVelocity.magnitude, 0),
          distance: toFixed(distance, 0),
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
