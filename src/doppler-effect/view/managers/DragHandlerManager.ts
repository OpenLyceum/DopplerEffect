/**
 * DragHandlerManager.ts
 *
 * Manages a single drag handler for an object in the Doppler Effect simulation.
 * Dragging sets a velocity rather than writing the position 1:1 — a skill "custom
 * mapping" case wrapped in one RichDragListener for a11y:
 * - pointer: velocity proportional to the pointer's offset from the object;
 * - keyboard (object focused): arrow keys set a PHYSICS.KEYBOARD_SPEED velocity in the
 *   pressed direction that persists after release, exactly like the global arrow keys
 *   (see KeyboardHandlerManager), so both keyboard paths behave the same.
 */

import {
  DerivedProperty,
  type ModelViewTransform2,
  type Node,
  type Property,
  RichDragListener,
  type TReadOnlyProperty,
  Vector2,
} from "scenerystack";
import { PHYSICS } from "../../../DopplerEffectConstants.js";

/**
 * Manager for creating and attaching a drag handler to a simulation object
 */
export class DragHandlerManager {
  private readonly modelViewTransform: ModelViewTransform2;
  private dragOffset: Vector2 = new Vector2(0, 0);
  private readonly maxSpeedProperty: TReadOnlyProperty<number>;

  /**
   * Constructor for the DragHandlerManager
   *
   * @param modelViewTransform - Transform between model and view coordinates
   * @param soundSpeedProperty - Property containing the current sound speed
   */
  constructor(modelViewTransform: ModelViewTransform2, soundSpeedProperty: TReadOnlyProperty<number>) {
    this.modelViewTransform = modelViewTransform;

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

    // Custom mapping: drag direction → velocity (not positionProperty writes). Movement
    // is limited by the model's movement bounds, so no drag bounds are needed here.
    const richDragListener = new RichDragListener({
      transform: this.modelViewTransform,
      dragListenerOptions: {
        targetNode: targetNode,
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
        start: () => {
          onSelected();
        },
        drag: (_event, listener) => {
          // Only the direction of the keyboard step matters; its speed is fixed.
          if (listener.modelDelta.magnitude > 0) {
            velocityProperty.value = clampVelocity(listener.modelDelta.withMagnitude(PHYSICS.KEYBOARD_SPEED));
            movingProperty.value = true;
          }
        },
      },
    });

    targetNode.addInputListener(richDragListener);
  }
}
