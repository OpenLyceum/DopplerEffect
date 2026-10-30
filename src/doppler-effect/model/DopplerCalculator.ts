import type { Vector2 } from "scenerystack";
import type { Wave } from "./DopplerEffectModel.js";

/**
 * DopplerCalculator handles the physics calculations for the Doppler effect.
 */
export class DopplerCalculator {
  /**
   * Calculate observed frequency using the Doppler formula
   * @param wave The wave reaching the observer
   * @param observerPosition Current observer position in meters (m)
   * @param observerVelocity Current observer velocity in meters per second (m/s)
   * @param soundSpeed Current speed of sound in meters per second (m/s)
   * @returns The observed frequency in Hertz (Hz)
   */
  public calculateObservedFrequency(
    wave: Wave,
    observerPosition: Vector2,
    observerVelocity: Vector2,
    soundSpeed: number,
  ): number {
    // Calculate unit vector from source to observer (dimensionless). An observer sitting
    // exactly on the emission point has no line of sight, so no shift is defined.
    const separation = observerPosition.minus(wave.position); // in meters (m)
    if (separation.magnitude === 0) {
      return wave.sourceFrequency;
    }
    const direction = separation.normalized(); // dimensionless unit vector

    // Calculate velocity components along the direction vector
    const sourceVelocityComponent = wave.sourceVelocity.dot(direction); // in meters per second (m/s)
    const observerVelocityComponent = observerVelocity.dot(direction); // in meters per second (m/s)

    // Calculate observed frequency using Doppler formula:
    // f' = f * (v - v_o) / (v - v_s)
    // where f is emitted frequency, v is sound speed,
    // v_o is observer velocity component, v_s is source velocity component
    const observedFrequency =
      (wave.sourceFrequency * // in Hertz (Hz)
        (soundSpeed - observerVelocityComponent)) / // in meters per second (m/s)
      (soundSpeed - sourceVelocityComponent); // in meters per second (m/s) // result in Hertz (Hz)

    return observedFrequency; // in Hertz (Hz)
  }

  /**
   * Find what the observer hears now: the newest wavefront that has passed it, and the
   * phase of the sound at its position.
   *
   * Wavefronts are emitted in order and (the source being subsonic) never overtake one
   * another, so the fronts that have passed the observer are the oldest ones. The phase is
   * interpolated between the newest passed front and the following one by how far the
   * observer sits between them. That is the source's phase at the retarded time, so it is
   * continuous from front to front and already includes motion of both source and observer.
   * @param waves Fronts in emission order, oldest first
   * @param observerPosition Current observer position in meters (m)
   * @param nextFront The front the source has yet to emit (radius ≤ 0), closing the gap behind the newest front
   * @returns The newest passed front and the phase in radians (rad), or null if no front has reached the observer
   */
  public findObservedSignal(
    waves: ArrayLike<Wave>,
    observerPosition: Vector2,
    nextFront: Pick<Wave, "position" | "radius" | "phaseAtEmission">,
  ): { wave: Wave; phase: number } | null {
    for (let i = waves.length - 1; i >= 0; i--) {
      const wave = waves[i];
      if (wave === undefined) {
        continue;
      }
      const overshoot = wave.radius - wave.position.distance(observerPosition); // in meters (m)
      if (overshoot >= 0) {
        const following = waves[i + 1] ?? nextFront;
        const shortfall = Math.max(0, following.position.distance(observerPosition) - following.radius); // in meters (m)
        const fraction = overshoot + shortfall > 0 ? overshoot / (overshoot + shortfall) : 0; // dimensionless
        const phase = wave.phaseAtEmission + (following.phaseAtEmission - wave.phaseAtEmission) * fraction; // in radians (rad)
        return { wave, phase };
      }
    }
    return null;
  }
}
