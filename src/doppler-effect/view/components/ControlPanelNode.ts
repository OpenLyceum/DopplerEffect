/**
 * ControlPanelNode.ts
 *
 * Contains the control panel functionality for the Doppler Effect simulation,
 * including checkboxes for visibility options and controls for sound speed and frequency.
 */

import {
  Node,
  NumberControl,
  Panel,
  PhetFont,
  type Property,
  type Range,
  type ReadOnlyProperty,
  Text,
  VerticalCheckboxGroup,
  type VerticalCheckboxGroupItem,
} from "scenerystack";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { StringManager } from "../../../i18n/StringManager.js";

// Configuration options for the control panel
type ControlPanelOptions = {
  // References to graph display for positioning
  graphRight: number;
  graphBottom: number;
};

/**
 * Component that renders the control panel for the simulation
 */
export class ControlPanelNode extends Node {
  // The panel component
  private readonly panel: Panel;

  // String manager instance
  private readonly stringManager: StringManager = StringManager.getInstance();

  /**
   * Constructor for the ControlPanelNode
   *
   * @param visibleValuesProperty - Property for toggling value displays
   * @param visibleVelocityArrowProperty - Property for toggling velocity arrows
   * @param visibleLineOfSightProperty - Property for toggling line of sight
   * @param visibleTrailsProperty - Property for toggling motion trails
   * @param visibleGridProperty - Property for toggling grid visibility
   * @param microphoneEnabledProperty - Property for toggling microphone
   * @param soundSpeedProperty - Property for controlling sound speed
   * @param emittedFrequencyProperty - Property for controlling emitted frequency
   * @param soundSpeedRange - Range for the sound speed control
   * @param frequencyRange - Range for the frequency control
   * @param options - Configuration options
   */
  constructor(
    visibleValuesProperty: Property<boolean>,
    visibleVelocityArrowProperty: Property<boolean>,
    visibleLineOfSightProperty: Property<boolean>,
    visibleTrailsProperty: Property<boolean>,
    visibleGridProperty: Property<boolean>,
    microphoneEnabledProperty: Property<boolean>,
    soundSpeedProperty: Property<number>,
    emittedFrequencyProperty: Property<number>,
    soundSpeedRange: Range,
    frequencyRange: Range,
    options: ControlPanelOptions,
  ) {
    super();

    // Get strings from string manager
    const strings = this.stringManager.getControlPanelStrings();

    // Helper function to create checkbox item with consistent styling
    // and handle StringProperty
    const createCheckboxItem = (
      property: Property<boolean>,
      labelProp: ReadOnlyProperty<string>,
    ): VerticalCheckboxGroupItem => ({
      property,
      createNode: () => {
        return new Text(labelProp, {
          font: new PhetFont(14),
          fill: DopplerEffectColors.controlPanelTextColorProperty,
        });
      },
    });

    // Create checkbox items
    const items: VerticalCheckboxGroupItem[] = [
      createCheckboxItem(visibleValuesProperty, strings.valuesStringProperty),
      createCheckboxItem(visibleVelocityArrowProperty, strings.velocityArrowsStringProperty),
      createCheckboxItem(visibleLineOfSightProperty, strings.lineOfSightStringProperty),
      createCheckboxItem(visibleTrailsProperty, strings.motionTrailsStringProperty),
      createCheckboxItem(visibleGridProperty, strings.gridStringProperty),
      createCheckboxItem(microphoneEnabledProperty, strings.microphoneClicksStringProperty),
    ];

    // Create vertical checkbox group
    const checkboxGroup = new VerticalCheckboxGroup(items, {
      checkboxOptions: {
        checkboxColor: DopplerEffectColors.controlPanelTextColorProperty,
        checkboxColorBackground: DopplerEffectColors.controlPanelBackgroundColorProperty,
      },
    });

    // Create sound speed control
    const a11y = this.stringManager.getA11yStrings();
    const soundSpeedControl = new NumberControl(strings.soundSpeedStringProperty, soundSpeedProperty, soundSpeedRange, {
      layoutFunction: NumberControl.createLayoutFunction2({ ySpacing: 12 }),
      numberDisplayOptions: {
        valuePattern: strings.metersPerSecondStringProperty,
      },
      titleNodeOptions: {
        font: new PhetFont(12),
        maxWidth: 140,
        fill: DopplerEffectColors.controlPanelTextColorProperty,
      },
      accessibleName: a11y.controls.soundSpeedStringProperty,
      accessibleHelpText: a11y.controls.soundSpeedHelpStringProperty,
    });
    soundSpeedControl.top = checkboxGroup.bottom + 10;

    // Create frequency control
    const frequencyControl = new NumberControl(
      strings.frequencyStringProperty,
      emittedFrequencyProperty,
      frequencyRange,
      {
        layoutFunction: NumberControl.createLayoutFunction2({ ySpacing: 12 }),
        numberDisplayOptions: {
          valuePattern: strings.hertzStringProperty,
        },
        titleNodeOptions: {
          font: new PhetFont(12),
          maxWidth: 140,
          fill: DopplerEffectColors.controlPanelTextColorProperty,
        },
        accessibleName: a11y.controls.emittedFrequencyStringProperty,
        accessibleHelpText: a11y.controls.emittedFrequencyHelpStringProperty,
      },
    );
    frequencyControl.top = soundSpeedControl.bottom + 10;

    // Create the panel content with all controls
    const panelContent = new Node({
      children: [checkboxGroup, soundSpeedControl, frequencyControl],
    });

    // Create the panel with the content
    this.panel = new Panel(panelContent, {
      right: options.graphRight,
      top: options.graphBottom + 10,
      fill: DopplerEffectColors.controlPanelBackgroundColorProperty,
      stroke: DopplerEffectColors.controlPanelBorderColorProperty,
      accessibleName: a11y.controls.controlPanelStringProperty,
    });

    // Add the panel to this node
    this.addChild(this.panel);
  }
}
