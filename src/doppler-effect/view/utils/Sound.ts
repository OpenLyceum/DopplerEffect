/**
 * Sound.ts
 *
 * One-shot synthesized click played when a wavefront reaches the microphone.
 *
 * The click is a short sine burst (500 Hz, ~10 ms envelope). It is a tambo
 * `SoundGenerator` registered with `soundManager`, so the nav-bar / Preferences
 * sound toggle mutes it and the sim stays usable with sound off. No
 * `Audio` element or standalone `AudioContext` is created.
 */

import { SoundGenerator, soundManager } from "scenerystack/tambo";

// Click synthesis. The envelope peaks at PEAK_GAIN into the generator's output
// (output level 1), matching the previous direct-to-destination click.
const SOUND = {
  CLICK_FREQUENCY: 500, // Hz
  ATTACK_TIME: 0.001, // seconds
  DECAY_TIME: 0.01, // seconds
  PEAK_GAIN: 0.3,
  INITIAL_GAIN: 0,
  FINAL_GAIN: 0,
};

/**
 * Synthesized microphone click. One instance is registered with `soundManager`
 * and `play()` is called each time a wave is detected.
 */
export class Sound extends SoundGenerator {
  public constructor() {
    super({ initialOutputLevel: 1 });
    soundManager.addSoundGenerator(this);
  }

  /**
   * Play the click. No-op while sound is muted (`fullyEnabled` is false), so a
   * suspended or disabled audio graph is never touched.
   */
  public play(): void {
    if (!this.fullyEnabledProperty.value) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(SOUND.CLICK_FREQUENCY, this.audioContext.currentTime);
    oscillator.connect(envelope);
    envelope.connect(this.soundSourceDestination);

    const now = this.audioContext.currentTime;
    envelope.gain.setValueAtTime(SOUND.INITIAL_GAIN, now);
    envelope.gain.linearRampToValueAtTime(SOUND.PEAK_GAIN, now + SOUND.ATTACK_TIME);
    envelope.gain.linearRampToValueAtTime(SOUND.FINAL_GAIN, now + SOUND.DECAY_TIME);

    oscillator.start(now);
    oscillator.stop(now + SOUND.DECAY_TIME);
  }
}
