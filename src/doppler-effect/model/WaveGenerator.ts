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

  // Cumulative distance sound has travelled since reset, ∫ c dt (m). A front's radius is
  // this minus its birthTravel, so it stays exact when the speed of sound changes.
  private travelDistance: number = 0; // in meters (m)
  // travelDistance at each recorded step, so time reversal restores radii exactly.
  private travelHistory: Array<{ time: number; travel: number }> = [{ time: 0, travel: 0 }];

  // Microphone detection state
  private lastDetectionTime: number = 0;
  private static readonly DETECTION_COOLDOWN = 0.01; // seconds between detections

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
   * Generate new waves based on emitted frequency. Call after {@link updateWaves}, so a
   * front emitted part-way through the step starts with the radius it reached by now.
   */
  public generateWaves(): void {
    const simulationTime = this.getSimulationTime(); // in seconds (s)
    const waveInterval = 1.0 / this.getEmittedFrequency(); // in seconds (s)
    const soundSpeed = this.getSoundSpeed(); // in meters/second (m/s)

    // Advance the emission clock by whole intervals rather than snapping it to the
    // current time. Snapping would let each frame's leftover fraction accumulate and
    // stretch the spacing between waves; stepping by waveInterval keeps the cadence
    // drift-free and emits every wave whose interval falls inside a long frame.
    while (simulationTime - this.lastWaveTime > waveInterval) {
      this.lastWaveTime += waveInterval; // in seconds (s)

      // Each front is stamped with its own emission time. The source is moved back along
      // its velocity to where it was then, and the front has already travelled for the
      // part of the step since, so two fronts emitted in one long frame stay distinct.
      const lag = simulationTime - this.lastWaveTime; // in seconds (s), within one step
      const sourceVelocity = this.getSourceVelocity();
      const newWave: Wave = {
        position: this.getSourcePosition().minus(sourceVelocity.timesScalar(lag)), // in meters (m)
        radius: soundSpeed * lag, // in meters (m)
        birthTime: this.lastWaveTime, // in seconds (s)
        birthTravel: this.travelDistance - soundSpeed * lag, // in meters (m)
        sourceVelocity: sourceVelocity.copy(), // in meters/second (m/s)
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
   * Update existing waves (expand radius, remove ones that have outrun the play area).
   * Call before {@link generateWaves} in each step.
   * @param simulationTime Current simulation time in seconds (s)
   * @param modelDt Current model delta time in seconds (s)
   */
  public updateWaves(simulationTime: number, modelDt: number): void {
    this.travelDistance += modelDt * this.getSoundSpeed(); // in meters (m)
    this.travelHistory.push({ time: simulationTime, travel: this.travelDistance });

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves.get(i);
      wave.radius = this.travelDistance - wave.birthTravel; // in meters (m)

      // A front is kept until it could no longer reach any point of the play area, so
      // even at the slowest sound speed it reaches an observer at the far side. Negative
      // radii only arise from time reversal.
      if (wave.radius > WAVE.MAX_RADIUS || wave.radius < 0) {
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
   * Each front therefore registers exactly once. (A static tolerance band on top of the
   * sweep made a front sitting just short of the position register on two consecutive
   * frames, doubling the click.)
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
      // True if the expanding front swept across the position during this step
      if (previousRadius < distance && distance <= wave.radius) {
        this.lastDetectionTime = currentTime;
        return true;
      }
    }
    return false;
  }

  /**
   * Reset the wave generator state. The emission clock restarts at the current
   * simulation time, so the next wave follows one interval from now rather than
   * every interval since t = 0 being emitted at once.
   */
  public reset(): void {
    this.lastWaveTime = this.getSimulationTime();
    this.lastDetectionTime = this.getSimulationTime();
    this.waves.clear();
    this.waveHistory = [];
    this.travelDistance = 0;
    this.travelHistory = [{ time: this.getSimulationTime(), travel: 0 }];
  }

  /**
   * Drop history entries that can no longer be restored: waves that had already
   * outrun the play area at the earliest restorable time are dead at every such time.
   * @param earliestRestorableTime Oldest time time-reversal can return to, in seconds (s)
   */
  public pruneHistory(earliestRestorableTime: number): void {
    let firstTravel = 0;
    while (
      firstTravel + 1 < this.travelHistory.length &&
      (this.travelHistory[firstTravel + 1]?.time ?? 0) <= earliestRestorableTime
    ) {
      firstTravel++;
    }
    if (firstTravel > 0) {
      this.travelHistory.splice(0, firstTravel);
    }

    const cutoff = (this.travelHistory[0]?.travel ?? 0) - WAVE.MAX_RADIUS;
    let firstKept = 0;
    while (firstKept < this.waveHistory.length && (this.waveHistory[firstKept]?.birthTravel ?? 0) < cutoff) {
      firstKept++;
    }
    if (firstKept > 0) {
      this.waveHistory.splice(0, firstKept);
    }
  }

  /**
   * Rewind the generator to an earlier time: forget waves emitted after it and move the
   * emission clock back by whole intervals, so replaying forward re-emits a gap-free train
   * instead of waiting for the old (future) clock and keeping duplicate fronts in history.
   * @param targetTime The time being rewound to, in seconds (s)
   */
  public rewindTo(targetTime: number): void {
    this.waveHistory = this.waveHistory.filter((wave) => wave.birthTime <= targetTime);
    this.travelHistory = this.travelHistory.filter((entry) => entry.time <= targetTime);
    this.travelDistance = this.travelHistory[this.travelHistory.length - 1]?.travel ?? 0;
    const waveInterval = 1.0 / this.getEmittedFrequency(); // in seconds (s)
    while (this.lastWaveTime > targetTime) {
      this.lastWaveTime -= waveInterval;
    }
    this.lastDetectionTime = Math.min(this.lastDetectionTime, targetTime);
    this.restoreWavesFromHistory(targetTime);
  }

  /**
   * Restore waves from history for a specific time
   * @param targetTime The time to restore waves to
   */
  private restoreWavesFromHistory(targetTime: number): void {
    // Clear current waves
    this.waves.clear();

    // Find waves that should exist at the target time
    for (const wave of this.waveHistory) {
      // The front's radius at the target time follows from the travel recorded then,
      // so it is exact even if the speed of sound changed during the wave's lifetime.
      const radius = this.travelDistance - wave.birthTravel;
      if (wave.birthTime <= targetTime && radius >= 0 && radius <= WAVE.MAX_RADIUS) {
        const restoredWave = {
          position: wave.position.copy(),
          radius: radius,
          birthTime: wave.birthTime,
          birthTravel: wave.birthTravel,
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
