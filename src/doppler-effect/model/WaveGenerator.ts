import type { ObservableArray, Vector2 } from "scenerystack";
import { WAVE } from "../../DopplerEffectConstants.js";
import type { Wave } from "./DopplerEffectModel.js";
/**
 * WaveGenerator handles the creation, propagation, and lifecycle management of waves.
 * It encapsulates all wave-related functionality for the Doppler effect simulation.
 */
export class WaveGenerator {
  private readonly waves: ObservableArray<Wave>;
  private readonly getSimulationTime: () => number; // returns time in seconds (s)
  private readonly getSourcePosition: () => Vector2; // returns position in meters (m)
  private readonly getSourceVelocity: () => Vector2; // returns velocity in meters/second (m/s)
  private readonly getEmittedFrequency: () => number; // returns frequency in Hertz (Hz)
  private readonly getSoundSpeed: () => number; // returns speed in meters/second (m/s)
  private readonly getEmittedPhase: () => number; // returns phase in radians (rad)

  // Time tracking (in seconds)
  private lastWaveTime: number = 0; // in seconds (s)
  private waveHistory: Wave[] = []; // History of waves for time reversal

  // Microphone detection state
  private lastDetectionTime: number = 0;
  private static readonly DETECTION_COOLDOWN = 0.01; // seconds between detections
  private static readonly DETECTION_TOLERANCE = 2; // meters

  /**
   * Create a new WaveGenerator
   */
  constructor(
    waves: ObservableArray<Wave>,
    getSimulationTime: () => number, // returns time in seconds (s)
    getSourcePosition: () => Vector2, // returns position in meters (m)
    getSourceVelocity: () => Vector2, // returns velocity in meters/second (m/s)
    getEmittedFrequency: () => number, // returns frequency in Hertz (Hz)
    getSoundSpeed: () => number, // returns speed in meters/second (m/s)
    getEmittedPhase: () => number, // returns phase in radians (rad)
  ) {
    this.waves = waves;
    this.getSimulationTime = getSimulationTime;
    this.getSourcePosition = getSourcePosition;
    this.getSourceVelocity = getSourceVelocity;
    this.getEmittedFrequency = getEmittedFrequency;
    this.getSoundSpeed = getSoundSpeed;
    this.getEmittedPhase = getEmittedPhase;
  }

  /**
   * Generate new waves based on emitted frequency
   */
  public generateWaves(): void {
    const simulationTime = this.getSimulationTime(); // in seconds (s)
    const waveInterval = 1.0 / this.getEmittedFrequency(); // in seconds (s)

    // Advance the emission clock by whole intervals rather than snapping it to the
    // current time. Snapping would let each frame's leftover fraction accumulate and
    // stretch the spacing between waves; stepping by waveInterval keeps the cadence
    // drift-free and emits every wave whose interval falls inside a long frame.
    while (simulationTime - this.lastWaveTime > waveInterval) {
      this.lastWaveTime += waveInterval; // in seconds (s)

      // Create a new wave. Position/velocity/phase are sampled at the current source
      // state (the emission time is within one interval of now, so this is accurate).
      const newWave = {
        position: this.getSourcePosition().copy(), // in meters (m)
        radius: 0, // in meters (m)
        birthTime: simulationTime, // in seconds (s)
        sourceVelocity: this.getSourceVelocity().copy(), // in meters/second (m/s)
        sourceFrequency: this.getEmittedFrequency(), // in Hertz (Hz)
        phaseAtEmission: this.getEmittedPhase(), // in radians (rad)
      };

      // Add to active waves
      this.waves.add(newWave);

      // Store in history for time reversal
      this.waveHistory.push(newWave);
    }
  }

  /**
   * Update existing waves (expand radius, remove old ones)
   * @param simulationTime Current simulation time in seconds (s)
   * @param modelDt Current model delta time in seconds (s)
   */
  public updateWaves(simulationTime: number, modelDt: number): void {
    // Update existing waves
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves.get(i);

      // Update radius based on modelDt and sound speed (in meters)
      wave.radius += modelDt * this.getSoundSpeed(); // in meters (m)

      // Calculate age in seconds (s)
      const age = simulationTime - wave.birthTime; // in seconds (s)

      // Remove waves that are too old or have a negative radius (due to time reversal)
      if (age > WAVE.MAX_AGE || wave.radius < 0) {
        // WAVE.MAX_AGE in seconds (s)
        this.waves.remove(wave);
      }
    }
  }

  /**
   * Detect whether a wave front passes through a given position during the current step.
   *
   * Rather than checking whether a front is momentarily within a fixed tolerance band
   * (which a fast-expanding front can step right over between frames — e.g. at 343 m/s
   * and 60 fps a front advances ~5.7 m per frame, larger than the detection band), this
   * detects the front *crossing* the position: the front was inside the position last
   * step (radius < distance) and has reached or passed it this step (radius >= distance).
   * A small static tolerance is kept as a fallback for the dt ~ 0 case (paused/stepped).
   *
   * Returns true at most once per DETECTION_COOLDOWN interval.
   * @param position Position to check in meters (m)
   * @param currentTime Absolute simulation time in seconds (s)
   * @param modelDt Elapsed model time for this step in seconds (s)
   */
  public detectWaveAt(position: Vector2, currentTime: number, modelDt: number): boolean {
    if (currentTime - this.lastDetectionTime < WaveGenerator.DETECTION_COOLDOWN) {
      return false;
    }
    // Distance the wave front advanced during this step (meters)
    const stepAdvance = modelDt * this.getSoundSpeed();
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves.get(i);
      const distance = position.distance(wave.position);
      const previousRadius = wave.radius - stepAdvance;
      // True if the expanding front swept across the position during this step,
      // or (fallback) is essentially sitting on it when no time elapsed.
      if (
        (previousRadius < distance && distance <= wave.radius) ||
        Math.abs(distance - wave.radius) < WaveGenerator.DETECTION_TOLERANCE
      ) {
        this.lastDetectionTime = currentTime;
        return true;
      }
    }
    return false;
  }

  /**
   * Reset the wave generator state
   */
  public reset(): void {
    this.lastWaveTime = 0;
    this.lastDetectionTime = 0;
    this.waves.clear();
    this.waveHistory = [];
  }

  /**
   * Restore waves from history for a specific time
   * @param targetTime The time to restore waves to
   */
  public restoreWavesFromHistory(targetTime: number): void {
    // Clear current waves
    this.waves.clear();

    // Find waves that should exist at the target time
    for (const wave of this.waveHistory) {
      // Only include waves that were born before the target time
      // and haven't exceeded their maximum age
      if (wave.birthTime <= targetTime && targetTime - wave.birthTime <= WAVE.MAX_AGE) {
        // Reconstruct the radius the front had at the target time. This is exact while
        // the sound speed is constant (radius = age * soundSpeed reduces to the forward
        // integration in WaveGenerator.updateWaves); if the speed changed during the
        // wave's lifetime it is a best-effort estimate from the current speed, consistent
        // with the arrival-time reconstruction in DopplerCalculator.findWavesAtObserver.
        // age is non-negative here (birthTime <= targetTime), so radius is too.
        const age = targetTime - wave.birthTime;
        const radius = Math.max(0, age * this.getSoundSpeed());

        const restoredWave = {
          position: wave.position.copy(),
          radius: radius,
          birthTime: wave.birthTime,
          sourceVelocity: wave.sourceVelocity.copy(),
          sourceFrequency: wave.sourceFrequency,
          phaseAtEmission: wave.phaseAtEmission,
        };

        // Add to active waves
        this.waves.add(restoredWave);
      }
    }
  }
}
