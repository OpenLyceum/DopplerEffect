/**
 * VectorDisplay.ts
 *
 * Manages the display of a single velocity vector with optional velocity value display.
 */

import {
  ArrowNode,
  type ModelViewTransform2,
  Node,
  NumberDisplay,
  PhetFont,
  type ProfileColorProperty,
  Property,
  Range,
  type TReadOnlyProperty,
  type Vector2,
} from "scenerystack";
import { StringManager } from "../../../i18n/StringManager.js";

/**
 * Configuration options for the vector display
 */
type VectorDisplayOptions = {
  headHeight?: number;
  headWidth?: number;
  tailWidth?: number;
  scaleTailToo?: boolean;
  visibleProperty?: TReadOnlyProperty<boolean>;
  fillColorProperty: ProfileColorProperty;
  strokeColorProperty: ProfileColorProperty;
  showVelocityValue?: boolean;
  textColorProperty?: ProfileColorProperty;
  visibleValuesProperty?: TReadOnlyProperty<boolean>;
};

/**
 * Component that displays a single velocity vector with optional velocity value
 */
export class VectorDisplay extends Node {
  private readonly modelViewTransform: ModelViewTransform2;
  private readonly velocityScale: number;
  private readonly arrowNode: ArrowNode;
  private readonly velocityDisplay?: NumberDisplay;
  private readonly velocityProperty: Property<number>;

  /**
   * Constructor for the VectorDisplay
   *
   * @param modelViewTransform - Transform between model and view coordinates
   * @param velocityScale - Scale factor for velocity vectors
   * @param options - Configuration options for the vector display
   */
  constructor(modelViewTransform: ModelViewTransform2, velocityScale: number, options: VectorDisplayOptions) {
    super();

    this.modelViewTransform = modelViewTransform;
    this.velocityScale = velocityScale;

    // Create velocity property for the display
    this.velocityProperty = new Property<number>(0);

    // Create arrow node with default or provided options
    this.arrowNode = new ArrowNode(0, 0, 0, 0, {
      headHeight: options.headHeight ?? 10,
      headWidth: options.headWidth ?? 10,
      tailWidth: options.tailWidth ?? 2,
      scaleTailToo: options.scaleTailToo ?? true,
      ...(options.visibleProperty ? { visibleProperty: options.visibleProperty } : {}),
      fill: options.fillColorProperty,
      stroke: options.strokeColorProperty,
    });
    this.addChild(this.arrowNode);

    // Create velocity display if requested
    if (options.showVelocityValue && options.textColorProperty) {
      this.velocityDisplay = new NumberDisplay(
        this.velocityProperty,
        new Range(0, 1000), // Reasonable range for velocity in m/s
        {
          decimalPlaces: 0,
          textOptions: {
            font: new PhetFont(14),
            fill: options.textColorProperty,
          },
          ...(options.visibleValuesProperty ? { visibleProperty: options.visibleValuesProperty } : {}),
          valuePattern: StringManager.getInstance().getAllStringProperties().units.metersPerSecondStringProperty,
          backgroundFill: "transparent",
          backgroundStroke: null,
          xMargin: 0,
          yMargin: 0,
        },
      );
      this.addChild(this.velocityDisplay);
    }
  }

  /**
   * Update the velocity vector visualization
   *
   * @param position - Current position of the object
   * @param velocity - Current velocity of the object
   */
  public updateVector(position: Vector2, velocity: Vector2): void {
    // Convert model coordinates to view coordinates
    const viewPosition = this.modelViewTransform.modelToViewPosition(position);

    // Scale velocity vector for visualization
    // First scale by the model-view transform to convert m/s to pixels/s
    // Then scale by velocityScale to make it more visible
    const scaledVelocity = velocity.timesScalar(this.velocityScale);
    const viewVelocity = this.modelViewTransform.modelToViewDelta(scaledVelocity);

    // Update arrow node
    this.arrowNode.setTailAndTip(
      viewPosition.x,
      viewPosition.y,
      viewPosition.x + viewVelocity.x,
      viewPosition.y + viewVelocity.y,
    );

    // Update velocity display if it exists
    if (this.velocityDisplay) {
      // Calculate velocity magnitude in m/s
      const velocityMagnitude = velocity.magnitude;
      this.velocityProperty.value = velocityMagnitude;

      // Position the velocity display above the arrow
      this.velocityDisplay.centerX = viewPosition.x + viewVelocity.x / 2;
      this.velocityDisplay.bottom = viewPosition.y + viewVelocity.y / 2 - 15; // Offset above the arrow
    }
  }
}
