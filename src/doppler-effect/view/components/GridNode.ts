import {
  type Bounds2,
  type ModelViewTransform2,
  Node,
  type NodeOptions,
  Path,
  type Property,
  Shape,
  type TReadOnlyProperty,
} from "scenerystack";

import DopplerEffectColors from "../../../DopplerEffectColors.js";

/**
 * Options for the GridNode
 */
export interface GridNodeOptions extends NodeOptions {
  /**
   * Size of major grid cells in model units (typically meters)
   */
  majorGridSize?: number;

  /**
   * Number of minor grid lines to draw inside each major grid cell
   */
  minorLinesPerMajorLine?: number;
}

/**
 * GridNode displays a grid with major and minor lines for spatial reference.
 * Major grid lines are more visible than minor grid lines.
 */
export class GridNode extends Node {
  // Properties
  private readonly modelViewTransform: ModelViewTransform2;
  private readonly majorGridPath: Path;
  private readonly minorGridPath: Path;

  // Configuration
  private readonly majorGridSize: number;
  private readonly minorLinesPerMajorLine: number;

  /**
   * Constructor for the GridNode
   * @param modelViewTransform - Transform between model and view coordinates
   * @param visibleProperty - Controls visibility of the grid
   * @param modelBoundsProperty - The bounds of the model area to cover
   * @param options - Additional options for the grid
   */
  public constructor(
    modelViewTransform: ModelViewTransform2,
    visibleProperty: Property<boolean>,
    modelBoundsProperty: TReadOnlyProperty<Bounds2>,
    options?: GridNodeOptions,
  ) {
    super();

    // Store properties
    this.modelViewTransform = modelViewTransform;

    // Set configuration with defaults
    this.majorGridSize = options?.majorGridSize || 1000; // 1000 meters per major grid cell
    this.minorLinesPerMajorLine = options?.minorLinesPerMajorLine || 4; // 4 minor lines per major grid cell

    // Create paths for major and minor grid lines
    this.majorGridPath = new Path(null, {
      stroke: DopplerEffectColors.gridMajorLineColorProperty,
      lineWidth: 1,
    });

    this.minorGridPath = new Path(null, {
      stroke: DopplerEffectColors.gridMinorLineColorProperty,
      lineWidth: 1,
    });

    // Add the grid paths to this node
    this.addChild(this.minorGridPath); // Add minor grid first (so it appears behind major grid)
    this.addChild(this.majorGridPath);

    // Update grid when model bounds change
    modelBoundsProperty.link((bounds) => {
      this.updateGrid(bounds);
    });

    // Update visibility when visibleProperty changes
    visibleProperty.link((visible) => {
      this.visible = visible;
    });
  }

  /**
   * Update the grid based on new model bounds
   * @param bounds - The bounds of the model area to cover
   */
  private updateGrid(bounds: Bounds2): void {
    // Calculate grid extents with some padding
    const padding = this.majorGridSize;
    const xMin = Math.floor((bounds.minX - padding) / this.majorGridSize) * this.majorGridSize;
    const xMax = Math.ceil((bounds.maxX + padding) / this.majorGridSize) * this.majorGridSize;
    const yMin = Math.floor((bounds.minY - padding) / this.majorGridSize) * this.majorGridSize;
    const yMax = Math.ceil((bounds.maxY + padding) / this.majorGridSize) * this.majorGridSize;

    // Create shapes for major and minor grids
    const majorGridShape = new Shape();
    const minorGridShape = new Shape();

    // Calculate minor grid spacing
    const minorGridSize = this.majorGridSize / (this.minorLinesPerMajorLine + 1);

    // Draw vertical major grid lines
    for (let x = xMin; x <= xMax; x += this.majorGridSize) {
      const viewX = this.modelViewTransform.modelToViewX(x);
      const viewYTop = this.modelViewTransform.modelToViewY(yMin);
      const viewYBottom = this.modelViewTransform.modelToViewY(yMax);

      majorGridShape.moveTo(viewX, viewYTop);
      majorGridShape.lineTo(viewX, viewYBottom);

      // Draw minor vertical grid lines (if not at a major grid line)
      if (x < xMax) {
        for (let mx = 1; mx <= this.minorLinesPerMajorLine; mx++) {
          const minorX = x + mx * minorGridSize;
          const viewMinorX = this.modelViewTransform.modelToViewX(minorX);

          minorGridShape.moveTo(viewMinorX, viewYTop);
          minorGridShape.lineTo(viewMinorX, viewYBottom);
        }
      }
    }

    // Draw horizontal major grid lines
    for (let y = yMin; y <= yMax; y += this.majorGridSize) {
      const viewY = this.modelViewTransform.modelToViewY(y);
      const viewXLeft = this.modelViewTransform.modelToViewX(xMin);
      const viewXRight = this.modelViewTransform.modelToViewX(xMax);

      majorGridShape.moveTo(viewXLeft, viewY);
      majorGridShape.lineTo(viewXRight, viewY);

      // Draw minor horizontal grid lines (if not at a major grid line)
      if (y < yMax) {
        for (let my = 1; my <= this.minorLinesPerMajorLine; my++) {
          const minorY = y + my * minorGridSize;
          const viewMinorY = this.modelViewTransform.modelToViewY(minorY);

          minorGridShape.moveTo(viewXLeft, viewMinorY);
          minorGridShape.lineTo(viewXRight, viewMinorY);
        }
      }
    }

    // Set the shapes to the paths
    this.majorGridPath.setShape(majorGridShape);
    this.minorGridPath.setShape(minorGridShape);
  }
}
