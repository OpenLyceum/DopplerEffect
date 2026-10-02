/**
 * DopplerEffectKeyboardHelpContent.ts
 *
 * Content for the standard keyboard-help dialog (the "?" button joist adds to
 * the navigation bar). Every custom row is `KeyboardHelpSectionRow.fromHotkeyData`
 * on `DopplerEffectHotkeyData`, which is also what the key listener matches.
 *
 * Keys the icon factory cannot draw (observer "o", trails "t", +/- , comma/period,
 * scenario digits past 3) pass an icon built from the same HotkeyData's glyphs.
 * The factory's English key map has no node for those strokes, and calling
 * `fromHotkeyData` without an icon would throw when the dialog opens.
 */

import type { Node, TColor } from "scenerystack/scenery";
import {
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  LetterKeyNode,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";
import { DopplerEffectHotkeyData } from "./DopplerEffectHotkeyData.js";

type SectionChrome = {
  textMaxWidth?: number;
  headingFill?: TColor;
  labelFill?: TColor;
};

function helpRow(
  hotkeyData: (typeof DopplerEffectHotkeyData)[keyof typeof DopplerEffectHotkeyData],
  icon?: Node,
  labelFill?: TColor,
) {
  return KeyboardHelpSectionRow.fromHotkeyData(hotkeyData, {
    ...(icon ? { icon } : {}),
    ...(labelFill ? { labelWithIconOptions: { labelOptions: { fill: labelFill } } } : {}),
  });
}

/**
 * The custom help sections, shared by the navigation-bar dialog and the in-sim
 * shortcuts panel so both render the same HotkeyData.
 */
export function createDopplerEffectKeyboardHelpSections(chrome?: SectionChrome): {
  left: KeyboardHelpSection[];
  right: KeyboardHelpSection[];
} {
  const strings = StringManager.getInstance().getInstructionsStrings();
  const labelFill = chrome?.labelFill;
  const sectionOptions = {
    ...(chrome?.textMaxWidth !== undefined ? { textMaxWidth: chrome.textMaxWidth } : {}),
    ...(chrome?.headingFill ? { headingOptions: { fill: chrome.headingFill } } : {}),
  };

  const navigationSection = new KeyboardHelpSection(
    strings.sections.navigationStringProperty,
    [
      helpRow(DopplerEffectHotkeyData.selectSource, undefined, labelFill),
      // "o" is a real shortcut but has no entry in KeyboardHelpIconFactory.
      helpRow(DopplerEffectHotkeyData.selectObserver, new LetterKeyNode("O"), labelFill),
      helpRow(DopplerEffectHotkeyData.move, undefined, labelFill),
    ],
    sectionOptions,
  );

  const adjustmentSection = new KeyboardHelpSection(
    strings.sections.parameterAdjustmentStringProperty,
    [
      helpRow(
        DopplerEffectHotkeyData.adjustFrequency,
        KeyboardHelpIconFactory.iconToIcon(new LetterKeyNode("+"), new LetterKeyNode("-")),
        labelFill,
      ),
      helpRow(
        DopplerEffectHotkeyData.adjustSoundSpeed,
        KeyboardHelpIconFactory.iconToIcon(new LetterKeyNode(","), new LetterKeyNode(".")),
        labelFill,
      ),
    ],
    sectionOptions,
  );

  const scenariosSection = new KeyboardHelpSection(
    strings.sections.scenariosStringProperty,
    [
      helpRow(
        DopplerEffectHotkeyData.scenarios,
        KeyboardHelpIconFactory.iconToIcon(new LetterKeyNode("0"), new LetterKeyNode("6")),
        labelFill,
      ),
    ],
    sectionOptions,
  );

  const simulationControlsSection = new KeyboardHelpSection(
    strings.sections.simulationControlsStringProperty,
    [
      helpRow(DopplerEffectHotkeyData.playPause, TextKeyNode.space(), labelFill),
      // "r" is a real shortcut but has no entry in KeyboardHelpIconFactory.
      helpRow(DopplerEffectHotkeyData.reset, new LetterKeyNode("R"), labelFill),
    ],
    sectionOptions,
  );

  const visibilitySection = new KeyboardHelpSection(
    strings.sections.visibilityOptionsStringProperty,
    [
      // "t" is a real shortcut but has no entry in KeyboardHelpIconFactory.
      helpRow(DopplerEffectHotkeyData.toggleTrails, new LetterKeyNode("T"), labelFill),
      helpRow(DopplerEffectHotkeyData.toggleMicrophone, undefined, labelFill),
      helpRow(DopplerEffectHotkeyData.toggleHelp, undefined, labelFill),
    ],
    sectionOptions,
  );

  const basicActionsSection = new BasicActionsKeyboardHelpSection({
    withCheckboxContent: true,
    ...sectionOptions,
  });

  return {
    left: [navigationSection, adjustmentSection, scenariosSection],
    right: [simulationControlsSection, visibilitySection, basicActionsSection],
  };
}

export class DopplerEffectKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const { left, right } = createDopplerEffectKeyboardHelpSections();
    KeyboardHelpSection.alignHelpSectionIcons(left);
    // Align the sim's own right-column sections (not the standard basic-actions one)
    KeyboardHelpSection.alignHelpSectionIcons(right.slice(0, -1));

    // The dialog also documents the stock controls the in-sim overlay leaves out:
    // the speed-of-sound and frequency sliders, and the scenario combo box.
    left.push(new SliderControlsKeyboardHelpSection());
    right.splice(right.length - 1, 0, new ComboBoxKeyboardHelpSection());
    super(left, right);
  }
}
