/**
 * StatusTextNode.ts
 *
 * Displays status text information including frequencies,
 * Doppler shift indicators, and selected object information.
 */

import {
  type Bounds2,
  DerivedProperty,
  Node,
  PhetFont,
  type ProfileColorProperty,
  Range,
  type ReadOnlyProperty,
  Text,
} from "scenerystack";
import { NumberDisplay } from "scenerystack/scenery-phet";
import { StringManager } from "../../../i18n/StringManager.js";

// Configuration options for the status text display
type StatusTextOptions = {
  layoutBounds: Bounds2;
  textColorProperty: ProfileColorProperty;
  blueshiftColorProperty: ProfileColorProperty;
  redshiftColorProperty: ProfileColorProperty;
  graphWidth: number;
  graphHeight: number;
  graphMargin: number;
  graphSpacing: number;
};

/**
 * Component that displays status information for the simulation
 */
export class StatusTextNode extends Node {
  private readonly observedFrequencyDisplay: NumberDisplay;
  private readonly shiftStatusText: Text;

  // Store color references
  private readonly textColorProperty: ProfileColorProperty;
  private readonly blueshiftColorProperty: ProfileColorProperty;
  private readonly redshiftColorProperty: ProfileColorProperty;

  // String manager instance
  private readonly stringManager: StringManager = StringManager.getInstance();

  /**
   * Constructor for the StatusTextNode
   *
   * @param observedFrequencyProperty - Property for the observed frequency value
   * @param emittedFrequencyProperty - Property for the emitted frequency value
   * @param visibleValuesProperty - Property that controls visibility of values
   * @param options - Configuration options
   */
  constructor(
    observedFrequencyProperty: ReadOnlyProperty<number>,
    emittedFrequencyProperty: ReadOnlyProperty<number>,
    visibleValuesProperty: ReadOnlyProperty<boolean>,
    options: StatusTextOptions,
  ) {
    super();

    // Store color references for later use
    this.textColorProperty = options.textColorProperty;
    this.blueshiftColorProperty = options.blueshiftColorProperty;
    this.redshiftColorProperty = options.redshiftColorProperty;

    // Get strings from string manager
    const statusStringProperties = this.stringManager.getStatusTextStrings();

    // Create NumberDisplay for observed frequency
    this.observedFrequencyDisplay = new NumberDisplay(observedFrequencyProperty, new Range(-100, 100), {
      decimalPlaces: 1,
      textOptions: {
        font: new PhetFont(14),
        fill: options.textColorProperty,
      },
      visibleProperty: visibleValuesProperty,
      valuePattern: statusStringProperties.observedFrequencyPatternStringProperty.value,
      backgroundFill: "transparent",
      backgroundStroke: null,
      xMargin: 0,
      yMargin: 0,
    });

    // Derived property for shift status text content
    const shiftStatusStringProperty = new DerivedProperty(
      [observedFrequencyProperty, emittedFrequencyProperty],
      (observed, emitted) => {
        if (observed > emitted) {
          return statusStringProperties.blueshiftStringProperty.value;
        } else if (observed < emitted) {
          return statusStringProperties.redshiftStringProperty.value;
        } else {
          return "";
        }
      },
    );

    // Derived property for shift status text color (color props are dependencies so
    // Projector Mode switches update the fill without a frequency change).
    const shiftStatusFillProperty = new DerivedProperty(
      [
        observedFrequencyProperty,
        emittedFrequencyProperty,
        this.blueshiftColorProperty,
        this.redshiftColorProperty,
        this.textColorProperty,
      ],
      (observed, emitted, blueshift, redshift, textColor) => {
        if (observed > emitted) {
          return blueshift;
        } else if (observed < emitted) {
          return redshift;
        } else {
          return textColor;
        }
      },
    );

    this.shiftStatusText = new Text(shiftStatusStringProperty, {
      font: new PhetFont({
        size: 16,
        weight: "bold",
      }),
      fill: shiftStatusFillProperty,
      visibleProperty: visibleValuesProperty,
    });

    // Position text elements
    // Calculate the center position for the text elements
    const centerX = options.layoutBounds.centerX;

    // Position observed frequency display near the center, slightly to the left
    this.observedFrequencyDisplay.centerX = centerX - 10;
    this.observedFrequencyDisplay.bottom = 25;

    // Position shift status text to the right of the frequency display
    this.shiftStatusText.left = this.observedFrequencyDisplay.right + 20; // Add some spacing between elements
    this.shiftStatusText.bottom = 25;

    // Add all elements to this node
    this.addChild(this.observedFrequencyDisplay);
    this.addChild(this.shiftStatusText);
  }
}
