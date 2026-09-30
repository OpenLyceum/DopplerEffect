/**
 * KeyboardShortcutsNode.ts
 *
 * Contains the keyboard shortcuts functionality for the Doppler Effect simulation.
 * Implements a structured help dialog with sections and rows for better organization.
 */

import { type Bounds2, KeyboardHelpSection, Node, type Property, Rectangle } from "scenerystack";
import { TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { createDopplerEffectKeyboardHelpSections } from "../DopplerEffectKeyboardHelpContent.js";

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

    // Create background panel
    const backgroundPanel = new Rectangle(0, 0, 1, 1, {
      fill: DopplerEffectColors.controlPanelBackgroundColorProperty,
      stroke: DopplerEffectColors.controlPanelBorderColorProperty,
      cornerRadius: 10,
    });
    this.addChild(backgroundPanel);

    // Same HotkeyData rows as the navigation-bar dialog, themed for this panel.
    // NOTE: theming the inner text of the standard basic-actions section with the sim's text
    // color profile is not yet wired up. Tracked in https://github.com/OpenLyceum/DopplerEffect/issues/26
    const { left, right } = createDopplerEffectKeyboardHelpSections({
      textMaxWidth: TEXT_MAX_WIDTH,
      headingFill: DopplerEffectColors.controlPanelTextColorProperty,
      labelFill: DopplerEffectColors.controlPanelTextColorProperty,
    });

    const helpContent = new TwoColumnKeyboardHelpContent(left, right);

    this.addChild(helpContent);

    // Set the background panel size to enclose the content with padding
    helpContent.boundsProperty.link((bounds) => {
      backgroundPanel.rectBounds = bounds.dilated(20);
    });

    // Position the entire node
    this.center = options.layoutBounds.center;

    // Align icons within each group
    KeyboardHelpSection.alignHelpSectionIcons(left);
    const visibilitySection = right[0];
    if (visibilitySection) {
      KeyboardHelpSection.alignHelpSectionIcons([visibilitySection]);
    }
  }

  /**
   * Toggle visibility of the keyboard shortcuts
   */
  public toggleVisibility(): void {
    this.visibilityControlProperty.value = !this.visibilityControlProperty.value;
  }
}
