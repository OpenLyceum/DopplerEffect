/**
 * DragHandlerManager.ts
 *
 * Manages a single drag handler for an object in the Doppler Effect simulation.
 * Dragging sets desired velocity from pointer/keyboard direction (not 1:1 position) —
 * a skill "custom mapping" case wrapped in one RichDragListener for a11y.
 */

import {
  type Bounds2,
  DerivedProperty,
  type ModelViewTransform2,
  type Node,
  Property,
  type ReadOnlyProperty,
  RichDragListener,
  Vector2,
} from "scenerystack";
import { PHYSICS } from "../../../DopplerEffectConstants.js";

/**
 * Manager for creating and attaching a drag handler to a simulation object
 */
export class DragHandlerManager {
  private readonly modelViewTransform: ModelViewTransform2;
  private readonly dragBounds: Bounds2;
  private richDragListener: RichDragListener | null = null;
  private dragOffset: Vector2 = new Vector2(0, 0);
  private readonly maxSpeedProperty: ReadOnlyProperty<number>;

  /**
   * Constructor for the DragHandlerManager
   *
   * @param modelViewTransform - Transform between model and view coordinates
   * @param layoutBounds - View bounds for constraining drag
   * @param soundSpeedProperty - Property containing the current sound speed
   */
  constructor(modelViewTransform: ModelViewTransform2, layoutBounds: Bounds2, soundSpeedProperty: Property<number>) {
    this.modelViewTransform = modelViewTransform;

    // drag bounds are the same as the layout bounds
    this.dragBounds = layoutBounds;

    // Create derived property for max speed based on sound speed
    this.maxSpeedProperty = new DerivedProperty(
      [soundSpeedProperty],
      (soundSpeed) => soundSpeed * PHYSICS.MAX_SPEED_FACTOR,
    );
  }

  /**
   * Add a drag handler to a node
   *
   * @param targetNode - The visual node to make draggable
   * @param positionProperty - Model property for object position
   * @param velocityProperty - Model property for object velocity
   * @param movingProperty - Model property for object moving state
   * @param onSelected - Callback for when object is selected
   */
  public attachDragHandler(
    targetNode: Node,
    positionProperty: Property<Vector2>,
    velocityProperty: Property<Vector2>,
    movingProperty: Property<boolean>,
    onSelected: () => void,
  ): void {
    const clampVelocity = (desiredVelocity: Vector2): Vector2 => {
      if (desiredVelocity.magnitude > this.maxSpeedProperty.value) {
        return desiredVelocity.normalized().timesScalar(this.maxSpeedProperty.value);
      }
      return desiredVelocity;
    };

    // Custom mapping: drag direction → velocity (not positionProperty writes).
    this.richDragListener = new RichDragListener({
      transform: this.modelViewTransform,
      dragListenerOptions: {
        targetNode: targetNode,
        dragBoundsProperty: new Property(this.dragBounds),
        allowTouchSnag: true,
        start: (event) => {
          onSelected();
          const viewPosition = this.modelViewTransform.modelToViewPosition(positionProperty.value);
          this.dragOffset = viewPosition.minus(event.pointer.point);
        },
        drag: (event) => {
          const viewPoint = event.pointer.point.plus(this.dragOffset);
          const modelPoint = this.modelViewTransform.viewToModelPosition(viewPoint);
          const positionDifference = modelPoint.minus(positionProperty.value);
          velocityProperty.value = clampVelocity(positionDifference.timesScalar(PHYSICS.POSITION_TO_VELOCITY_FACTOR));
          movingProperty.value = true;
        },
      },
      keyboardDragListenerOptions: {
        dragSpeed: 60,
        shiftDragSpeed: 20,
        start: () => {
          onSelected();
        },
        drag: (_event, listener) => {
          const desiredVelocity = clampVelocity(listener.modelDelta.timesScalar(PHYSICS.POSITION_TO_VELOCITY_FACTOR));
          velocityProperty.value = desiredVelocity;
          movingProperty.value = desiredVelocity.magnitude > 1e-6;
        },
        end: () => {
          velocityProperty.value = new Vector2(0, 0);
          movingProperty.value = false;
        },
      },
    });

    targetNode.addInputListener(this.richDragListener);
  }

  /**
   * Remove the drag handler from its target node
   */
  public detachDragHandler(): void {
    if (this.richDragListener) {
      const targetNode = this.richDragListener.dragListener.targetNode;
      if (targetNode) {
        targetNode.removeInputListener(this.richDragListener);
        this.richDragListener.dispose();
      }
      this.richDragListener = null;
    }
  }
}
