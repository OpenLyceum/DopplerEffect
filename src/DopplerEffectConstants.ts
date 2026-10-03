/**
 * Constants for the Doppler Effect simulation
 *
 * Units:
 * - All distances are in meters (m)
 * - All velocities are in meters per second (m/s)
 * - All frequencies are in Hertz (Hz)
 * - All times are in seconds (s)
 * - All angles are in radians (rad)
 */

import { Bounds2, Vector2 } from "scenerystack";
import DopplerEffectNamespace from "./DopplerEffectNamespace.js";

// Definition for waveform data used in visualization
export type WaveformPoint = {
  t: number; // Normalized sample position in [0, 1) (dimensionless); the newest sample is rightmost
  y: number; // Raw amplitude value (dimensionless), will be scaled for display
};

// Physical constants in SI units
export const PHYSICS = {
  SOUND_SPEED: 343.0, // Speed of sound in air (m/s) at room temperature
  EMITTED_FREQ: 4, // Base frequency of emitted sound (Hz)
  MIN_VELOCITY_MAG: 0.1, // Minimum velocity magnitude (m/s)
  POSITION_TO_VELOCITY_FACTOR: 0.1, // Factor to convert position difference to velocity (1/time)
  MAX_SPEED_FACTOR: 0.9, // Factor to limit maximum speed relative to sound speed
  KEYBOARD_SPEED: 100, // Speed set by the keyboard movement keys (m/s)
  KEYBOARD_FREQUENCY_STEP: 0.1, // Emitted-frequency change per +/- key press (Hz)
  KEYBOARD_SOUND_SPEED_STEP: 1.0, // Sound-speed change per , / . key press (m/s)
} as const;

// Default region the source and observer may move within (in meters). The view
// replaces it with the visible area once the layout is known.
export const MOVEMENT_BOUNDS = new Bounds2(-5000, -3000, 5000, 3000);

// Wave properties
export const WAVE = {
  // Largest radius a front is kept to (m): the diagonal of MOVEMENT_BOUNDS, so a front still
  // reaches an observer anywhere in the play area even at the slowest speed of sound.
  MAX_RADIUS: Math.hypot(MOVEMENT_BOUNDS.width, MOVEMENT_BOUNDS.height),
  INITIAL_OPACITY: 0.7, // Opacity of a newly emitted wavefront, fading to 0 at MAX_RADIUS (dimensionless)
  LINE_WIDTH: 2, // Stroke width of a wavefront (view px)
} as const;

// Initial positions (in meters)
export const INITIAL_POSITIONS = {
  SOURCE: new Vector2(-1000, 0), // Source starts 1000m left of center (m)
  OBSERVER: new Vector2(1000, 0), // Observer starts 1000m right of center (m)
} as const;

// Sound data
export const SOUND_DATA = {
  ARRAY_SIZE: 100, // Number of points in sound waveform arrays (dimensionless)
} as const;

// Time speed constants for simulation
export const TIME_SPEED = {
  SLOW: 0.25, // Slow simulation speed (dimensionless)
  NORMAL: 1.0, // Normal simulation speed (dimensionless)
  HISTORY_BUFFER_SIZE: 1000, // Number of simulation steps to store for time reversal
} as const;

// Scale factors for converting between model and view coordinates
export const SCALE = {
  // Time scaling: 1 second in model time = 1 seconds in real time
  TIME: 1, // Dimensionless scaling factor

  // Velocity visualization scaling
  // This scales the velocity vectors to make them more visible on screen
  VELOCITY_VECTOR: 10, // Dimensionless scaling factor

  // Scale factor for converting between model and view coordinates (0.1 "pixels" per meter)
  MODEL_VIEW: 0.1, // Pixels per meter (pixels/m)
} as const;

export const WAVEFORM = {
  HISTORY_BUFFER_SIZE: 1000, // Number of points in waveform history buffer (dimensionless)
} as const;

/**
 * Trail-related constants
 */
export const TRAIL = {
  // Maximum number of points in the trail
  MAX_POINTS: 100,

  // Maximum age of trail points in seconds
  MAX_AGE: 5,

  // Interval between trail samples in seconds
  SAMPLE_INTERVAL: 0.1,

  // Default trail width in pixels
  DEFAULT_WIDTH: 2,

  // Default trail opacity
  DEFAULT_OPACITY: 0.7,
} as const;

DopplerEffectNamespace.register("DopplerEffectConstants", {
  PHYSICS,
  WAVE,
  MOVEMENT_BOUNDS,
  INITIAL_POSITIONS,
  SOUND_DATA,
  TIME_SPEED,
  SCALE,
  WAVEFORM,
  TRAIL,
});
