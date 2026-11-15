/**
 * Wave.ts
 *
 * Emitted sound-front state used by the Doppler model and wave generator.
 */

import type { Vector2 } from "scenerystack/dot";

export type Wave = {
  position: Vector2;
  radius: number;
  birthTime: number;
  /** Cumulative sound travel ∫c dt at emission (m); the radius is the current travel minus this. */
  birthTravel: number;
  sourceVelocity: Vector2;
  sourceFrequency: number;
  /** Source phase when emitted (rad): 2πn for the n-th front since reset, so every front is a crest. */
  phaseAtEmission: number;
};
