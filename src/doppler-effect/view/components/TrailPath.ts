/**
 * TrailPath.ts
 *
 * Creates and manages motion trails for objects in the Doppler Effect simulation.
 * This class extends Path to directly manage the trail visualization.
 */

import {
  Color,
  LinearGradient,
  type ModelViewTransform2,
  Path,
  type ProfileColorProperty,
  type Property,
  Shape,
} from "scenerystack";

// Import position history point interface from model
import type { PositionHistoryPoint } from "../../model/DopplerEffectModel.js";

/**
 * Configuration options for the trail creator
 */
type TrailPathOptions = {
  trailColorProperty: ProfileColorProperty;
  visibleProperty: Property<boolean>;
  trailWidth: number;
};

/**
 * Creates and manages motion trails for objects
 */
export class TrailPath extends Path {
  private readonly modelViewTransform: ModelViewTransform2;
  private trailColorValue: Color;

  /**
   * Constructor for the TrailPath
   *
   * @param modelViewTransform - Transform to convert model coordinates to view coordinates
   * @param options - Configuration options for the trail
   */
  constructor(modelViewTransform: ModelViewTransform2, options: TrailPathOptions) {
    super(new Shape(), {
      stroke: options.trailColorProperty,
      lineWidth: options.trailWidth,
      visibleProperty: options.visibleProperty,
      tagName: null,
    });

    this.modelViewTransform = modelViewTransform;

    // Store initial color value and listen for changes
    this.trailColorValue = options.trailColorProperty.value;
    options.trailColorProperty.link((newColor) => {
      // Update the trail with the new color (it will be used next time updateTrail is called)
      this.trailColorValue = newColor;
      // If the trail is currently visible, update it immediately
      if (this.visible) {
        // Force an update of the trail's gradient the next time updateTrail is called
        this.stroke = newColor;
      }
    });
  }

  /**
   * Update motion trail
   *
   * @param trailPoints - History of position points
   */
  public updateTrail(trailPoints: PositionHistoryPoint[]): void {
    // Set visibility based on property and points
    this.visible = this.visible && trailPoints.length > 0;

    // If not visible or no points, return early
    if (!this.visible || trailPoints.length === 0) {
      return;
    }

    const firstPoint = trailPoints[0];
    const lastPoint = trailPoints[trailPoints.length - 1];
    if (firstPoint === undefined || lastPoint === undefined) {
      return;
    }

    // Create shape for the trail
    const trailShape = new Shape();

    // First, build a new path with all points
    const oldestPoint = this.modelViewTransform.modelToViewPosition(firstPoint.position);
    trailShape.moveToPoint(oldestPoint);

    // Add each subsequent point
    for (let i = 1; i < trailPoints.length; i++) {
      const trailPoint = trailPoints[i];
      if (trailPoint === undefined) {
        continue;
      }
      const point = this.modelViewTransform.modelToViewPosition(trailPoint.position);
      trailShape.lineToPoint(point);
    }

    // Update the path with the new shape
    this.shape = trailShape;

    // Calculate the gradient direction (from oldest to newest point)
    const startPoint = this.modelViewTransform.modelToViewPosition(firstPoint.position);
    const endPoint = this.modelViewTransform.modelToViewPosition(lastPoint.position);

    // Create gradient from oldest to newest point
    const gradient = new LinearGradient(startPoint.x, startPoint.y, endPoint.x, endPoint.y);

    // Add color stops - transparent at oldest point, full color at newest
    gradient.addColorStop(0, new Color(this.trailColorValue.r, this.trailColorValue.g, this.trailColorValue.b, 0.1));
    gradient.addColorStop(0.5, new Color(this.trailColorValue.r, this.trailColorValue.g, this.trailColorValue.b, 0.4));
    gradient.addColorStop(1, new Color(this.trailColorValue.r, this.trailColorValue.g, this.trailColorValue.b, 0.8));

    // Apply the gradient
    this.stroke = gradient;
  }
}
