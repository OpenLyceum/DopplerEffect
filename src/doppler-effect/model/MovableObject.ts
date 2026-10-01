import { BooleanProperty, type Bounds2, Property, type TReadOnlyProperty, Vector2 } from "scenerystack";
import { PHYSICS, TRAIL } from "../../DopplerEffectConstants.js";

/**
 * Position history point interface
 */
export interface PositionHistoryPoint {
  position: Vector2; // in meters (m)
  timestamp: number; // in seconds (s)
}

/**
 * MovableObject represents an object that can move in the simulation,
 * such as the sound source or the observer.
 */
export class MovableObject {
  // Position and movement properties
  public readonly positionProperty: Property<Vector2>; // in meters (m)
  public readonly velocityProperty: Property<Vector2>; // in meters per second (m/s)
  public readonly movingProperty: BooleanProperty;

  // Region the object may move within, in meters (m)
  private readonly boundsProperty: TReadOnlyProperty<Bounds2>;

  // Position history for trail
  private positionHistory: PositionHistoryPoint[] = [];
  private lastTrailSampleTime: number = 0;

  /**
   * Create a new movable object
   * @param initialPosition Initial position vector in meters (m)
   * @param boundsProperty Region the object may move within, in meters (m)
   */
  constructor(initialPosition: Vector2, boundsProperty: TReadOnlyProperty<Bounds2>) {
    this.boundsProperty = boundsProperty;
    this.positionProperty = new Property<Vector2>(initialPosition); // in meters (m)
    this.velocityProperty = new Property<Vector2>(new Vector2(0, 0)); // in meters per second (m/s)
    this.movingProperty = new BooleanProperty(false);
  }

  /**
   * Update position based on velocity and elapsed time
   * @param dt Elapsed time in seconds (s)
   * @param currentTime Absolute simulation time in seconds (s)
   */
  public updatePosition(dt: number, currentTime: number): void {
    if (this.movingProperty.value) {
      const position = this.positionProperty.value; // in meters (m)
      const velocity = this.velocityProperty.value; // in meters per second (m/s)

      // Update position based on velocity, stopping at the edge of the movement bounds
      // so the object can never drift out of view.
      const unclamped = position.plus(velocity.timesScalar(dt)); // in meters (m)
      const clamped = this.boundsProperty.value.closestPointTo(unclamped); // in meters (m)
      this.positionProperty.value = clamped;

      // Stop when the bounds were hit or the velocity is too small
      if (!clamped.equals(unclamped) || velocity.magnitude < PHYSICS.MIN_VELOCITY_MAG) {
        // PHYSICS.MIN_VELOCITY_MAG in m/s
        this.movingProperty.value = false;
        this.velocityProperty.value = new Vector2(0, 0);
      }
    }

    // Update position history for trail
    this.updatePositionHistory(currentTime);
  }

  /**
   * Update position history for trail
   * @param currentTime Absolute simulation time in seconds (s)
   */
  private updatePositionHistory(currentTime: number): void {
    // Only sample at specified intervals
    if (currentTime - this.lastTrailSampleTime >= TRAIL.SAMPLE_INTERVAL) {
      // Record position
      this.positionHistory.push({
        position: this.positionProperty.value.copy(),
        timestamp: currentTime,
      });

      // Update last sample time
      this.lastTrailSampleTime = currentTime;

      // Remove old positions based on age
      this.prunePositionHistory(currentTime);
    }
  }

  /**
   * Remove old positions from history that exceed the maximum age or count
   * @param currentTime Current simulation time in seconds (s)
   */
  private prunePositionHistory(currentTime: number): void {
    const maxAge = currentTime - TRAIL.MAX_AGE;

    // Prune trail
    while (
      this.positionHistory.length > TRAIL.MAX_POINTS ||
      (this.positionHistory[0] !== undefined && this.positionHistory[0].timestamp < maxAge)
    ) {
      this.positionHistory.shift();
    }
  }

  /**
   * Get the position history for trail visualization
   * @returns Array of position history points
   */
  public getTrailPoints(): PositionHistoryPoint[] {
    return this.positionHistory;
  }

  /**
   * Reset the movable object to its initial position
   * @param initialPosition Position to reset to in meters (m)
   */
  public reset(initialPosition: Vector2): void {
    this.positionProperty.value = initialPosition.copy(); // in meters (m)
    this.velocityProperty.value = new Vector2(0, 0); // in meters per second (m/s)
    this.movingProperty.value = false;

    // Clear position history
    this.positionHistory = [];
    this.lastTrailSampleTime = 0;
  }

  /**
   * Discard trail samples recorded after a time being rewound to
   * @param targetTime The time being rewound to, in seconds (s)
   */
  public rewindTo(targetTime: number): void {
    this.positionHistory = this.positionHistory.filter((point) => point.timestamp <= targetTime);
    this.lastTrailSampleTime = this.positionHistory[this.positionHistory.length - 1]?.timestamp ?? 0;
  }
}
