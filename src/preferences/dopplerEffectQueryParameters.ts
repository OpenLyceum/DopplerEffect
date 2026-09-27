/**
 * dopplerEffectQueryParameters.ts
 *
 * Sim-specific startup query parameters for Doppler Effect. All entries are
 * public and provide the initial values for the sim-specific preferences in
 * DopplerEffectPreferencesModel.
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
