/**
 * MicrophoneNode.ts
 *
 * Represents a visual microphone node that can be dragged around the simulation
 * and react to sound waves passing through it.
 */

import {
  type Bounds2,
  Circle,
  type ModelViewTransform2,
  Node,
  Path,
  type Property,
  Rectangle,
  RichDragListener,
  Shape,
  type TReadOnlyProperty,
  type Vector2,
} from "scenerystack";
import { stepTimer } from "scenerystack/axon";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { StringManager } from "../../../i18n/StringManager.js";
import { Sound } from "../utils/Sound.js";

// Constants for microphone visualization and behavior
const MICROPHONE = {
  // Size constants
  BODY_RADIUS: 15,
  DETECTION_RING_RADIUS: 20,
  STEM_WIDTH: 10,
  STEM_HEIGHT: 30,
  BASE_WIDTH: 24,
  BASE_HEIGHT: 8,
  GRID_SIZE: 4,
  GRID_EXTENT: 10,

  // Positioning constants
  STEM_X_OFFSET: -5,
  STEM_Y_OFFSET: 10,
  BASE_X_OFFSET: -12,
  BASE_Y_OFFSET: 35,

  // Styling constants
  BASE_CORNER_RADIUS: 3,
  GRID_LINE_WIDTH: 1,
  DETECTION_RING_LINE_WIDTH: 2,

  // Timing constants
  DETECTION_FLASH_DURATION: 100, // milliseconds

  // colorProperties
  bodyColorProperty: DopplerEffectColors.microphoneBodyColorProperty,
  stemColorProperty: DopplerEffectColors.microphoneStemColorProperty,
  baseColorProperty: DopplerEffectColors.microphoneBaseColorProperty,
  gridColorProperty: DopplerEffectColors.microphoneGridColorProperty,
  detectionRingColorProperty: DopplerEffectColors.microphoneDetectionRingColorProperty,
};

/**
 * MicrophoneNode that can be positioned within the simulation and
 * plays a sound when a wave passes through it
 */
export class MicrophoneNode extends Node {
  private readonly modelViewTransform: ModelViewTransform2;
  private readonly microphonePositionProperty: Property<Vector2>;
  private readonly waveDetectedProperty: Property<boolean>;
  // Microphone visual elements
  private readonly detectionRing: Circle;
  private readonly clickSound: Sound;

  /**
   * Create a new microphone node
   *
   * @param modelViewTransform - Transform between model and view coordinates
   * @param microphonePositionProperty - Property to track microphone position in model coordinates
   * @param waveDetectedProperty - Property that indicates when a wave passes through the microphone
   * @param dragBoundsProperty - Property that defines the allowed drag bounds
   */
  constructor(
    modelViewTransform: ModelViewTransform2,
    microphonePositionProperty: Property<Vector2>,
    waveDetectedProperty: Property<boolean>,
    dragBoundsProperty: TReadOnlyProperty<Bounds2>,
  ) {
    super({
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: StringManager.getInstance().getA11yStrings().controls.microphoneStringProperty,
    });

    this.modelViewTransform = modelViewTransform;
    this.microphonePositionProperty = microphonePositionProperty;
    this.waveDetectedProperty = waveDetectedProperty;

    // Create microphone body - a circle with stem
    const micBody = new Circle(MICROPHONE.BODY_RADIUS, {
      fill: MICROPHONE.bodyColorProperty,
    });

    // Create microphone stem
    const micStem = new Rectangle(
      MICROPHONE.STEM_X_OFFSET,
      MICROPHONE.STEM_Y_OFFSET,
      MICROPHONE.STEM_WIDTH,
      MICROPHONE.STEM_HEIGHT,
      {
        fill: MICROPHONE.stemColorProperty,
      },
    );

    // Create microphone base
    const micBase = new Rectangle(
      MICROPHONE.BASE_X_OFFSET,
      MICROPHONE.BASE_Y_OFFSET,
      MICROPHONE.BASE_WIDTH,
      MICROPHONE.BASE_HEIGHT,
      {
        fill: MICROPHONE.baseColorProperty,
        cornerRadius: MICROPHONE.BASE_CORNER_RADIUS,
      },
    );

    // Create microphone grid pattern
    const gridPattern = new Path(new Shape(), {
      stroke: MICROPHONE.gridColorProperty,
      lineWidth: MICROPHONE.GRID_LINE_WIDTH,
    });

    // Draw horizontal grid lines
    const gridShape = new Shape();
    for (let y = -MICROPHONE.GRID_EXTENT; y <= MICROPHONE.GRID_EXTENT; y += MICROPHONE.GRID_SIZE) {
      gridShape.moveTo(-MICROPHONE.GRID_EXTENT, y);
      gridShape.lineTo(MICROPHONE.GRID_EXTENT, y);
    }

    // Draw vertical grid lines
    for (let x = -MICROPHONE.GRID_EXTENT; x <= MICROPHONE.GRID_EXTENT; x += MICROPHONE.GRID_SIZE) {
      gridShape.moveTo(x, -MICROPHONE.GRID_EXTENT);
      gridShape.lineTo(x, MICROPHONE.GRID_EXTENT);
    }

    gridPattern.shape = gridShape;

    // Add components to microphone node
    this.addChild(micStem);
    this.addChild(micBase);
    this.addChild(micBody);
    this.addChild(gridPattern);

    // Add highlight ring that shows when detecting waves
    this.detectionRing = new Circle(MICROPHONE.DETECTION_RING_RADIUS, {
      stroke: MICROPHONE.detectionRingColorProperty,
      lineWidth: MICROPHONE.DETECTION_RING_LINE_WIDTH,
      visible: false,
    });
    this.addChild(this.detectionRing);

    // Create click sound (synthesized via WebAudio; no audio file is loaded)
    this.clickSound = new Sound();

    // Position microphone at initial position
    this.center = this.modelViewTransform.modelToViewPosition(this.microphonePositionProperty.value);

    // Pointer + keyboard drag via one RichDragListener (model coords via transform).
    this.addInputListener(
      new RichDragListener({
        transform: this.modelViewTransform,
        positionProperty: this.microphonePositionProperty,
        dragBoundsProperty: dragBoundsProperty,
        dragListenerOptions: {
          targetNode: this,
        },
        keyboardDragListenerOptions: {
          dragSpeed: 100,
          shiftDragSpeed: 40,
        },
      }),
    );

    this.microphonePositionProperty.lazyLink(this.updatePosition.bind(this));

    // Add listener for wave detection
    this.waveDetectedProperty.lazyLink(this.handleWaveDetection.bind(this));
  }

  /**
   * Handle wave detection events
   * @param detected - Whether a wave was detected
   */
  private handleWaveDetection(detected: boolean): void {
    if (detected) {
      // Show detection ring
      this.detectionRing.visible = true;

      // Play click sound
      this.clickSound.play();

      // Hide ring after a short delay. stepTimer (not window.setTimeout) is driven by the
      // sim's animation loop, so the callback runs in step with rendering.
      stepTimer.setTimeout(() => {
        this.detectionRing.visible = false;
      }, MICROPHONE.DETECTION_FLASH_DURATION);
    }
  }

  /**
   * Update the microphone position based on the model property
   */
  private updatePosition(): void {
    this.center = this.modelViewTransform.modelToViewPosition(this.microphonePositionProperty.value);
  }
}
