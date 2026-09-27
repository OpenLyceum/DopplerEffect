/**
 * KeyboardShortcutsNode.ts
 *
 * Contains the keyboard shortcuts functionality for the Doppler Effect simulation.
 * Implements a structured help dialog with sections and rows for better organization.
 */

import {
  type Bounds2,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  Node,
  type Property,
  Rectangle,
} from "scenerystack";
import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpIconFactory,
  LetterKeyNode,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { StringManager } from "../../../i18n/StringManager.js";

// Configuration options for the keyboard shortcuts display
type KeyboardShortcutsOptions = {
  visibleProperty: Property<boolean>;
  layoutBounds: Bounds2;
};

const TEXT_MAX_WIDTH = 1000;

/**
 * Component that renders the keyboard help instructions for the simulation in a structured format
 */
export class KeyboardShortcutsNode extends Node {
  // Store reference to visibility property
  private readonly visibilityControlProperty: Property<boolean>;

  /**
   * Constructor for the KeyboardShortcutsNode
   *
   * @param options - Configuration options
   */
  constructor(options: KeyboardShortcutsOptions) {
    super({
      visibleProperty: options.visibleProperty,
    });

    this.visibilityControlProperty = options.visibleProperty;

    // Get strings from string manager
    const strings = StringManager.getInstance().getInstructionsStrings();

    // Create background panel
    const backgroundPanel = new Rectangle(0, 0, 1, 1, {
      fill: DopplerEffectColors.controlPanelBackgroundColorProperty,
      stroke: DopplerEffectColors.controlPanelBorderColorProperty,
      cornerRadius: 10,
    });
    this.addChild(backgroundPanel);

    // Common options for all sections
    const sectionOptions = {
      textMaxWidth: TEXT_MAX_WIDTH,
      headingOptions: {
        fill: DopplerEffectColors.controlPanelTextColorProperty,
      },
    };

    // Create the content for object movement
    const navigationSection = new KeyboardHelpSection(
      strings.sections.navigationStringProperty,
      [
        KeyboardHelpSectionRow.labelWithIcon(
          strings.objectSelection.selectSourceStringProperty,
          new LetterKeyNode("S"),
          {
            labelInnerContent: strings.a11y.objectSelection.selectSourceStringProperty,
            labelOptions: {
              fill: DopplerEffectColors.controlPanelTextColorProperty,
            },
          },
        ),
        KeyboardHelpSectionRow.labelWithIcon(
          strings.objectSelection.selectObserverStringProperty,
          new LetterKeyNode("O"),
          {
            labelInnerContent: strings.a11y.objectSelection.selectObserverStringProperty,
            labelOptions: {
              fill: DopplerEffectColors.controlPanelTextColorProperty,
            },
          },
        ),
        KeyboardHelpSectionRow.labelWithIcon(
          strings.objectSelection.moveObjectStringProperty,
          KeyboardHelpIconFactory.arrowOrWasdKeysRowIcon(),
          {
            labelInnerContent: strings.a11y.objectSelection.moveObjectStringProperty,
            labelOptions: {
              fill: DopplerEffectColors.controlPanelTextColorProperty,
            },
          },
        ),
      ],
      sectionOptions,
    );

    // Create the content for parameter adjustment
    const adjustmentSection = new KeyboardHelpSection(
      strings.sections.parameterAdjustmentStringProperty,
      [
        KeyboardHelpSectionRow.labelWithIcon(
          strings.adjust.frequencyStringProperty,
          KeyboardHelpIconFactory.iconToIcon(new LetterKeyNode("+"), new LetterKeyNode("-")),
          {
            labelInnerContent: strings.a11y.adjust.frequencyStringProperty,
            labelOptions: {
              fill: DopplerEffectColors.controlPanelTextColorProperty,
            },
          },
        ),
        KeyboardHelpSectionRow.labelWithIcon(
          strings.adjust.soundSpeedStringProperty,
          KeyboardHelpIconFactory.iconToIcon(new LetterKeyNode(","), new LetterKeyNode(".")),
          {
            labelInnerContent: strings.a11y.adjust.soundSpeedStringProperty,
            labelOptions: {
              fill: DopplerEffectColors.controlPanelTextColorProperty,
            },
          },
        ),
      ],
      sectionOptions,
    );

    // Create the content for scenarios
    const scenariosSection = new KeyboardHelpSection(
      strings.sections.scenariosStringProperty,
      [
        KeyboardHelpSectionRow.labelWithIcon(
          strings.scenarioKeys.freePlayStringProperty,
          KeyboardHelpIconFactory.iconToIcon(new LetterKeyNode("0"), new LetterKeyNode("6")),
          {
            labelInnerContent: strings.a11y.scenarioKeys.freePlayStringProperty,
            labelOptions: {
              fill: DopplerEffectColors.controlPanelTextColorProperty,
            },
          },
        ),
      ],
      sectionOptions,
    );

    // Create the content for visibility toggles
    const visibilitySection = new KeyboardHelpSection(
      strings.sections.visibilityOptionsStringProperty,
      [
        KeyboardHelpSectionRow.labelWithIcon(strings.toggleMotionTrailsStringProperty, new LetterKeyNode("T"), {
          labelInnerContent: strings.a11y.toggleMotionTrailsStringProperty,
          labelOptions: {
            fill: DopplerEffectColors.controlPanelTextColorProperty,
          },
        }),
        KeyboardHelpSectionRow.labelWithIcon(strings.toggleMicrophoneStringProperty, new LetterKeyNode("M"), {
          labelInnerContent: strings.a11y.toggleMicrophoneStringProperty,
          labelOptions: {
            fill: DopplerEffectColors.controlPanelTextColorProperty,
          },
        }),
        KeyboardHelpSectionRow.labelWithIcon(strings.controls.toggleHelpStringProperty, new LetterKeyNode("H"), {
          labelInnerContent: strings.a11y.controls.toggleHelpStringProperty,
          labelOptions: {
            fill: DopplerEffectColors.controlPanelTextColorProperty,
          },
        }),
      ],
      sectionOptions,
    );

    // Create standard basic actions section (includes tab navigation, space/enter, etc.)
    // NOTE: theming the inner text of this standard section with the sim's text color profile is
    // not yet wired up. Tracked in https://github.com/OpenLyceum/DopplerEffect/issues/26
    const basicActionsSection = new BasicActionsKeyboardHelpSection({
      withCheckboxContent: true,
      textMaxWidth: TEXT_MAX_WIDTH,
      headingOptions: {
        fill: DopplerEffectColors.controlPanelTextColorProperty,
      },
    });

    // Use TwoColumnKeyboardHelpContent for better organization
    const helpContent = new TwoColumnKeyboardHelpContent(
      // Left column sections
      [navigationSection, adjustmentSection, scenariosSection],
      // Right column sections
      [visibilitySection, basicActionsSection],
    );

    this.addChild(helpContent);

    // Set the background panel size to enclose the content with padding
    helpContent.boundsProperty.link((bounds) => {
      backgroundPanel.rectBounds = bounds.dilated(20);
    });

    // Position the entire node
    this.center = options.layoutBounds.center;

    // Align icons within each group
    KeyboardHelpSection.alignHelpSectionIcons([navigationSection, adjustmentSection, scenariosSection]);
    KeyboardHelpSection.alignHelpSectionIcons([visibilitySection]);
  }

  /**
   * Toggle visibility of the keyboard shortcuts
   */
  public toggleVisibility(): void {
    this.visibilityControlProperty.value = !this.visibilityControlProperty.value;
  }
}
