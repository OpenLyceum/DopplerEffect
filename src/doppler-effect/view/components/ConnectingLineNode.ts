import {
  Line,
  type ModelViewTransform2,
  Multilink,
  Node,
  PhetFont,
  type Property,
  Range,
  type TReadOnlyProperty,
  type Vector2,
} from "scenerystack";
import { NumberDisplay } from "scenerystack/scenery-phet";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { StringManager } from "../../../i18n/StringManager.js";

/**
 * A node that displays a connecting line between two points with a distance label
 */
export class ConnectingLineNode extends Node {
  /**
   * @param modelViewTransform - The transform between model and view coordinates
   * @param sourcePositionProperty - The position of the source
   * @param observerPositionProperty - The position of the observer
   * @param visibleValuesProperty - Property controlling visibility of the distance label
   * @param visibleLineOfSightProperty - Property controlling visibility of the line
   * @param sourceObserverDistanceProperty - Property containing the distance between source and observer
   */
  public constructor(
    modelViewTransform: ModelViewTransform2,
    sourcePositionProperty: TReadOnlyProperty<Vector2>,
    observerPositionProperty: TReadOnlyProperty<Vector2>,
    visibleValuesProperty: Property<boolean>,
    visibleLineOfSightProperty: Property<boolean>,
    sourceObserverDistanceProperty: TReadOnlyProperty<number>,
  ) {
    super({
      visibleProperty: visibleLineOfSightProperty,
    });

    // Create the connecting line
    const line = new Line(0, 0, 0, 0, {
      stroke: DopplerEffectColors.connectingLineColorProperty,
      lineDash: [10, 5],
    });
    this.addChild(line);

    // Create NumberDisplay for distance
    const distanceLabel = new NumberDisplay(
      sourceObserverDistanceProperty,
      new Range(0, 10000), // Reasonable range for distance in meters
      {
        decimalPlaces: 0,
        textOptions: {
          font: new PhetFont(14),
          fill: DopplerEffectColors.textColorProperty,
        },
        visibleProperty: visibleValuesProperty,
        valuePattern: StringManager.getInstance().getAllStringProperties().units.metersStringProperty,
        backgroundFill: "transparent",
        backgroundStroke: null,
        xMargin: 0,
        yMargin: 0,
      },
    );
    this.addChild(distanceLabel);

    // Update the line and label when positions change
    Multilink.multilink([sourcePositionProperty, observerPositionProperty], (sourcePosition, observerPosition) => {
      // Convert source and observer positions to view coordinates
      const viewSourcePosition = modelViewTransform.modelToViewPosition(sourcePosition);
      const viewObserverPosition = modelViewTransform.modelToViewPosition(observerPosition);

      // Update the line position
      line.setPoint1(viewSourcePosition).setPoint2(viewObserverPosition);

      // Calculate the midpoint between source and observer in view coordinates
      const viewMidPosition = viewSourcePosition.blend(viewObserverPosition, 0.5);

      // Position the label at the midpoint of the line
      distanceLabel.center = viewMidPosition.addXY(0, -15); // offset above the line
    });
  }
}
