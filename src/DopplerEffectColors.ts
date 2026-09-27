/**
 * DopplerEffectColors.ts
 *
 * Central location for all colors used in the Doppler Effect simulation, providing
 * support for different color profiles (default and projector mode).
 */

import { Color, ProfileColorProperty } from "scenerystack/scenery";
import DopplerEffectNamespace from "./DopplerEffectNamespace.js";

const BLACK = new Color(0, 0, 0);
const WHITE = new Color(255, 255, 255);
const YELLOW = new Color(255, 255, 0);

const DopplerEffectColors = {
  // Background / text
  backgroundColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "backgroundColor", {
    default: BLACK,
    projector: WHITE,
  }),
  textColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "textColor", {
    default: WHITE,
    projector: BLACK,
  }),
  highlightColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "highlightColor", {
    default: new Color(100, 100, 100),
    projector: new Color(150, 150, 150),
  }),

  // Source and observer
  sourceColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "sourceColor", {
    default: new Color(100, 255, 100),
    projector: new Color(0, 200, 0),
  }),
  observerColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "observerColor", {
    default: new Color(180, 50, 255),
    projector: new Color(120, 0, 180),
  }),

  // Waves and selection
  connectingLineColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "connectingLineColor", {
    default: new Color(200, 200, 200),
    projector: new Color(100, 100, 100),
  }),
  waveColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "waveColor", {
    default: new Color(200, 200, 200),
    projector: new Color(100, 100, 100),
  }),
  selectionColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "selectionColor", {
    default: new Color(255, 153, 0),
    projector: new Color(255, 255, 0),
  }),

  // Graph
  graphBackgroundColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "graphBackgroundColor", {
    default: new Color(50, 50, 50),
    projector: new Color(240, 240, 240),
  }),
  graphGridColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "graphGridColor", {
    default: new Color(150, 150, 150),
    projector: new Color(200, 200, 200),
  }),
  redshiftColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "redshiftColor", {
    default: new Color(255, 100, 100),
    projector: new Color(255, 40, 40),
  }),
  blueshiftColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "blueshiftColor", {
    default: new Color(100, 100, 255),
    projector: new Color(40, 40, 255),
  }),

  // Microphone
  microphoneBodyColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "microphoneBodyColor", {
    default: new Color(150, 150, 150),
    projector: new Color(100, 100, 100),
  }),
  microphoneStemColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "microphoneStemColor", {
    default: new Color(130, 130, 130),
    projector: new Color(80, 80, 80),
  }),
  microphoneBaseColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "microphoneBaseColor", {
    default: new Color(100, 100, 100),
    projector: new Color(50, 50, 50),
  }),
  microphoneGridColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "microphoneGridColor", {
    default: new Color(180, 180, 180),
    projector: new Color(40, 40, 40),
  }),
  microphoneDetectionRingColorProperty: new ProfileColorProperty(
    DopplerEffectNamespace,
    "microphoneDetectionRingColor",
    { default: new Color(255, 200, 0), projector: YELLOW },
  ),

  // Control panel
  controlPanelBackgroundColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "controlPanelBackgroundColor", {
    default: new Color(50, 50, 50),
    projector: new Color(238, 238, 238),
  }),
  controlPanelBorderColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "controlPanelBorderColor", {
    default: new Color(150, 150, 150),
    projector: new Color(210, 210, 210),
  }),
  controlPanelTextColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "controlPanelTextColor", {
    default: WHITE,
    projector: BLACK,
  }),

  // Velocity arrows
  sourceVelocityArrowColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "sourceVelocityArrowColor", {
    default: new Color(100, 255, 100),
    projector: new Color(0, 200, 0),
  }),
  observerVelocityArrowColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "observerVelocityArrowColor", {
    default: new Color(180, 50, 255),
    projector: new Color(120, 0, 180),
  }),

  // Grid lines
  gridMajorLineColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "gridMajorLineColor", {
    default: new Color(120, 120, 120),
    projector: new Color(80, 80, 80),
  }),
  gridMinorLineColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "gridMinorLineColor", {
    default: new Color(70, 70, 70),
    projector: new Color(180, 180, 180),
  }),

  // Fleet-standard panel / text aliases (shared Panel + ButtonOptions modules).
  panelBackgroundColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "panelBackground", {
    default: new Color(50, 50, 50),
    projector: new Color(238, 238, 238),
  }),
  panelBorderColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "panelBorder", {
    default: new Color(150, 150, 150),
    projector: new Color(210, 210, 210),
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(DopplerEffectNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
};

export default DopplerEffectColors;
