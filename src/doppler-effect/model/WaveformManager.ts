import { WAVEFORM, type WaveformPoint } from "../../DopplerEffectConstants.js";

// One recorded sample of both signals
type WaveformSample = {
  time: number; // in seconds (s), a multiple of WAVEFORM.SAMPLE_INTERVAL
  emitted: number; // amplitude (dimensionless)
  observed: number; // amplitude (dimensionless); 0 while no wavefront has reached the observer
};

/**
 * WaveformManager records the emitted and observed sound and turns the recent part of
 * the record into the data the waveform graphs draw.
 *
 * Samples are taken on a fixed model-time grid (WAVEFORM.SAMPLE_INTERVAL), interpolating
 * the phase across each step, so the graphs' time axis is uniform regardless of frame rate
 * or time speed. The amplitude is cos(phase), and a wavefront carries phase 2πn, so every
 * crest of the emitted trace is a front leaving the source and every crest of the observed
 * trace is a front passing the observer.
 */
export class WaveformManager {
  // Recorded samples, oldest first. Kept back far enough that a step backward can still fill the graphs.
  private readonly samples: WaveformSample[] = [];

  // Waveform data for the view: the samples inside the last WAVEFORM.TIME_WINDOW
  public readonly emittedWaveformData: WaveformPoint[] = [];
  public readonly observedWaveformData: WaveformPoint[] = [];

  // Time and phases recorded at the end of the previous step, to interpolate from
  private lastTime: number = 0; // in seconds (s)
  private lastEmittedPhase: number = 0; // in radians (rad)
  private lastObservedPhase: number | null = null; // in radians (rad), null when nothing has arrived

  /**
   * Record the signals up to the current time.
   * @param time Current simulation time in seconds (s)
   * @param emittedPhase Phase of the source at that time in radians (rad)
   * @param observedPhase Phase heard by the observer in radians (rad), or null if no front has arrived
   */
  public record(time: number, emittedPhase: number, observedPhase: number | null): void {
    const stepDuration = time - this.lastTime; // in seconds (s)
    if (stepDuration > 0) {
      const firstIndex = Math.floor(this.lastTime / WAVEFORM.SAMPLE_INTERVAL) + 1;
      const lastIndex = Math.floor(time / WAVEFORM.SAMPLE_INTERVAL);
      for (let index = firstIndex; index <= lastIndex; index++) {
        const sampleTime = index * WAVEFORM.SAMPLE_INTERVAL; // in seconds (s)
        const fraction = (sampleTime - this.lastTime) / stepDuration; // dimensionless, in (0, 1]

        // A front that first arrives during this step leaves the samples before it silent.
        const observed =
          observedPhase === null || this.lastObservedPhase === null
            ? 0
            : Math.cos(this.lastObservedPhase + (observedPhase - this.lastObservedPhase) * fraction);

        this.samples.push({
          time: sampleTime,
          emitted: Math.cos(this.lastEmittedPhase + (emittedPhase - this.lastEmittedPhase) * fraction),
          observed: observed,
        });
      }
    }
    this.setCurrent(time, emittedPhase, observedPhase);
  }

  /**
   * Forget the samples after an earlier time, so the graphs show the restored moment.
   * @param time Time being rewound to in seconds (s)
   * @param emittedPhase Phase of the source at that time in radians (rad)
   * @param observedPhase Phase heard by the observer in radians (rad), or null if no front has arrived
   */
  public rewindTo(time: number, emittedPhase: number, observedPhase: number | null): void {
    while ((this.samples[this.samples.length - 1]?.time ?? Number.NEGATIVE_INFINITY) > time) {
      this.samples.pop();
    }
    this.setCurrent(time, emittedPhase, observedPhase);
  }

  /**
   * Drop samples that no restorable time can show any more.
   * @param earliestRestorableTime Oldest time time-reversal can return to, in seconds (s)
   */
  public pruneHistory(earliestRestorableTime: number): void {
    const cutoff = earliestRestorableTime - WAVEFORM.TIME_WINDOW; // in seconds (s)
    let firstKept = 0;
    while (firstKept < this.samples.length && (this.samples[firstKept]?.time ?? 0) < cutoff) {
      firstKept++;
    }
    if (firstKept > 0) {
      this.samples.splice(0, firstKept);
    }
  }

  /**
   * Clear the record and start again from the given time.
   * @param time Current simulation time in seconds (s)
   * @param emittedPhase Phase of the source at that time in radians (rad)
   */
  public reset(time: number, emittedPhase: number): void {
    this.samples.length = 0;
    this.setCurrent(time, emittedPhase, null);
  }

  /**
   * Store the end-of-step state and rebuild the view data for the window ending at that time.
   */
  private setCurrent(time: number, emittedPhase: number, observedPhase: number | null): void {
    this.lastTime = time;
    this.lastEmittedPhase = emittedPhase;
    this.lastObservedPhase = observedPhase;

    // Samples are in time order, so the window is a suffix of the record
    const windowStart = time - WAVEFORM.TIME_WINDOW; // in seconds (s)
    let first = this.samples.length;
    while (first > 0 && (this.samples[first - 1]?.time ?? Number.NEGATIVE_INFINITY) >= windowStart) {
      first--;
    }

    this.emittedWaveformData.length = 0;
    this.observedWaveformData.length = 0;
    for (let i = first; i < this.samples.length; i++) {
      const sample = this.samples[i];
      if (sample !== undefined) {
        const t = (sample.time - windowStart) / WAVEFORM.TIME_WINDOW; // dimensionless, in [0, 1]
        this.emittedWaveformData.push({ t: t, y: sample.emitted });
        this.observedWaveformData.push({ t: t, y: sample.observed });
      }
    }
  }
}
