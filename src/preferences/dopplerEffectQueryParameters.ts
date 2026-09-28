/**
 * dopplerEffectQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in DopplerEffectPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?microphoneEnabled=true` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import DopplerEffectNamespace from "../DopplerEffectNamespace.js";

const dopplerEffectQueryParameters = QueryStringMachine.getAll({
  /** Whether the microphone tool is enabled by default. */
  microphoneEnabled: {
    type: "boolean",
    defaultValue: false,
    public: true,
  },
});

DopplerEffectNamespace.register("dopplerEffectQueryParameters", dopplerEffectQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default dopplerEffectQueryParameters;
