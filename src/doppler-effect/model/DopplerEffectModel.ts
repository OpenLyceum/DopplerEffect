import {
  BooleanProperty,
  createObservableArray,
  DerivedProperty,
  Enumeration,
  EnumerationProperty,
  EnumerationValue,
  NumberProperty,
  type ObservableArray,
  Property,
  RangeWithValue,
  TimeSpeed,
  type TReadOnlyProperty,
  Vector2,
} from "scenerystack";
import {
  INITIAL_POSITIONS,
  PHYSICS,
  SCALE,
  SOUND_DATA,
  TIME_SPEED,
  type WaveformPoint,
} from "../../DopplerEffectConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { DopplerEffectPreferencesModel } from "../../preferences/DopplerEffectPreferencesModel.js";
import dopplerEffectQueryParameters from "../../preferences/dopplerEffectQueryParameters.js";
import { DopplerCalculator } from "./DopplerCalculator.js";
import { MovableObject, type PositionHistoryPoint } from "./MovableObject.js";
import { WaveformManager } from "./WaveformManager.js";
import { WaveGenerator } from "./WaveGenerator.js";

// Export the Wave type
export type Wave = {
  position: Vector2;
  radius: number;
  birthTime: number;
  sourceVelocity: Vector2;
  sourceFrequency: number;
  phaseAtEmission: number;
};

// Wave detection type for microphone
export type WaveDetection = {
  wave: Wave;
  detectionTime: number;
};

// Position history points type — canonical definition lives in MovableObject.ts
export type { PositionHistoryPoint } from "./MovableObject.js";

// Simulation state history type for time reversal.
// Waves are intentionally not snapshotted here: wave restoration is handled by
// WaveGenerator's own history (see restoreSimulationState), so the source/observer
// kinematic state plus the timestamp is all that needs to be retained.
export type SimulationState = {
  time: number;
  sourcePosition: Vector2;
  observerPosition: Vector2;
  sourceVelocity: Vector2;
  observerVelocity: Vector2;
};

export class Scenario extends EnumerationValue {
  // String property for display name
  public readonly displayNameProperty: TReadOnlyProperty<string>;

  // Constructor with string properties
  public constructor(displayNameProperty: TReadOnlyProperty<string>) {
    super();

    this.displayNameProperty = displayNameProperty;
  }

  // Static initialization for each scenario type
  public static readonly FREE_PLAY = new Scenario(
    StringManager.getInstance().getScenarioStrings().freePlayStringProperty,
  );

  public static readonly SOURCE_APPROACHING = new Scenario(
    StringManager.getInstance().getScenarioStrings().sourceApproachingStringProperty,
  );

  public static readonly SOURCE_RECEDING = new Scenario(
    StringManager.getInstance().getScenarioStrings().sourceRecedingStringProperty,
  );

  public static readonly OBSERVER_APPROACHING = new Scenario(
    StringManager.getInstance().getScenarioStrings().observerApproachingStringProperty,
  );

  public static readonly OBSERVER_RECEDING = new Scenario(
    StringManager.getInstance().getScenarioStrings().observerRecedingStringProperty,
  );

  public static readonly SAME_DIRECTION = new Scenario(
    StringManager.getInstance().getScenarioStrings().sameDirectionStringProperty,
  );

  public static readonly PERPENDICULAR = new Scenario(
    StringManager.getInstance().getScenarioStrings().perpendicularStringProperty,
  );

  // Gets a list of keys, values and mapping between them. For use in EnumerationProperty
  public static readonly enumeration = new Enumeration(Scenario);
}

type ScenarioConfig = {
  readonly sourceVelocity: Vector2;
  readonly observerVelocity: Vector2;
  readonly sourceMoving: boolean;
  readonly observerMoving: boolean;
};

const SCENARIO_CONFIGS = new Map<Scenario, ScenarioConfig>([
  [
    Scenario.FREE_PLAY,
    {
      sourceVelocity: new Vector2(0, 0),
      observerVelocity: new Vector2(0, 0),
      sourceMoving: false,
      observerMoving: false,
    },
  ],
  [
    Scenario.SOURCE_APPROACHING,
    {
      sourceVelocity: new Vector2(100, 0),
      observerVelocity: new Vector2(0, 0),
      sourceMoving: true,
      observerMoving: false,
    },
  ],
  [
    Scenario.SOURCE_RECEDING,
    {
      sourceVelocity: new Vector2(-100, 0),
      observerVelocity: new Vector2(0, 0),
      sourceMoving: true,
      observerMoving: false,
    },
  ],
  [
    Scenario.OBSERVER_APPROACHING,
    {
      sourceVelocity: new Vector2(0, 0),
      observerVelocity: new Vector2(-100, 0),
      sourceMoving: false,
      observerMoving: true,
    },
  ],
  [
    Scenario.OBSERVER_RECEDING,
    {
      sourceVelocity: new Vector2(0, 0),
      observerVelocity: new Vector2(100, 0),
      sourceMoving: false,
      observerMoving: true,
    },
  ],
  [
    Scenario.SAME_DIRECTION,
    {
      sourceVelocity: new Vector2(100, 0),
      observerVelocity: new Vector2(100, 0),
      sourceMoving: true,
      observerMoving: true,
    },
  ],
  [
    Scenario.PERPENDICULAR,
    {
      sourceVelocity: new Vector2(0, 100),
      observerVelocity: new Vector2(0, 0),
      sourceMoving: true,
      observerMoving: false,
    },
  ],
]);

/**
 * Model for the Doppler Effect simulation
 *
 * This model is the main coordinator for the simulation, connecting the various
 * specialized classes that handle different aspects of the simulation.
 */
export class DopplerEffectModel {
  // Properties for physics simulation
  public readonly soundSpeedProperty: NumberProperty; // in meters per second (m/s)
  public readonly emittedFrequencyProperty: NumberProperty; // in Hertz (Hz)
  public readonly scenarioProperty: EnumerationProperty<Scenario>;
  public readonly timeSpeedProperty: EnumerationProperty<TimeSpeed>; // dimensionless factor
  public readonly soundSpeedRange: RangeWithValue; // in meters per second (m/s)
  public readonly frequencyRange: RangeWithValue; // in Hertz (Hz)

  // Microphone properties
  public readonly microphonePositionProperty: Property<Vector2>; // Vector2 position of microphone
  public readonly microphoneEnabledProperty: BooleanProperty; // Whether microphone is enabled
  public readonly waveDetectedProperty: BooleanProperty; // Emits when a wave is detected

  // Source and observer objects
  private readonly source: MovableObject; // position in meters (m)
  private readonly observer: MovableObject; // position in meters (m)

  // For convenience, expose properties directly
  public readonly sourcePositionProperty; // in meters (m)
  public readonly sourceVelocityProperty; // in meters per second (m/s)
  public readonly sourceMovingProperty;
  public readonly observerPositionProperty; // in meters (m)
  public readonly observerVelocityProperty; // in meters per second (m/s)
  public readonly observerMovingProperty;

  // Distance between source and observer
  public readonly sourceObserverDistanceProperty: TReadOnlyProperty<number>;

  // Simulation state properties
  public readonly simulationTimeProperty: NumberProperty; // in seconds (s)
  public readonly observedFrequencyProperty: NumberProperty; // in Hertz (Hz)
  public readonly playProperty: BooleanProperty;

  // Time reversal properties
  private simulationStateHistory: SimulationState[] = [];

  // Wave collection
  public readonly waves: ObservableArray<Wave>; // radius in meters (m)

  // Specialized component classes
  private readonly waveGenerator: WaveGenerator;
  private readonly waveformManager: WaveformManager;
  private readonly dopplerCalculator: DopplerCalculator;

  // Expose waveform data for view access
  public get emittedWaveformData(): WaveformPoint[] {
    return this.waveformManager.emittedWaveformData;
  }

  public get observedWaveformData(): WaveformPoint[] {
    return this.waveformManager.observedWaveformData;
  }

  // Expose sound data for backward compatibility
  public get emittedSoundData(): number[] {
    return this.waveformManager.emittedSoundData;
  }

  public get observedSoundData(): number[] {
    return this.waveformManager.observedSoundData;
  }

  // Expose position history for view access
  public get sourceTrail(): PositionHistoryPoint[] {
    return this.source.getTrailPoints();
  }

  public get observerTrail(): PositionHistoryPoint[] {
    return this.observer.getTrailPoints();
  }

  // Waveform update counter
  private waveformUpdateCounter: number = 0;

  /**
   * Constructor for the Doppler Effect DopplerEffectModel
   */
  private readonly preferences: DopplerEffectPreferencesModel | undefined;

  public constructor(preferences?: DopplerEffectPreferencesModel) {
    this.preferences = preferences;
    // Initialize physics properties
    this.soundSpeedProperty = new NumberProperty(PHYSICS.SOUND_SPEED);
    this.emittedFrequencyProperty = new NumberProperty(PHYSICS.EMITTED_FREQ);
    this.soundSpeedRange = new RangeWithValue(PHYSICS.SOUND_SPEED * 0.5, PHYSICS.SOUND_SPEED * 2, PHYSICS.SOUND_SPEED);
    this.frequencyRange = new RangeWithValue(
      PHYSICS.EMITTED_FREQ * 0.2,
      PHYSICS.EMITTED_FREQ * 2,
      PHYSICS.EMITTED_FREQ,
    );
    this.scenarioProperty = new EnumerationProperty(Scenario.FREE_PLAY);
    this.timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL);

    // Initialize microphone properties
    this.microphonePositionProperty = new Property<Vector2>(new Vector2(0, 20));
    this.microphoneEnabledProperty = new BooleanProperty(dopplerEffectQueryParameters.microphoneEnabled);
    this.waveDetectedProperty = new BooleanProperty(false);

    // Initialize simulation state
    this.simulationTimeProperty = new NumberProperty(0);
    this.observedFrequencyProperty = new NumberProperty(PHYSICS.EMITTED_FREQ);
    this.playProperty = new BooleanProperty(true);

    // Create the wave array
    this.waves = createObservableArray<Wave>([]);

    // Initialize source and observer
    this.source = new MovableObject(INITIAL_POSITIONS.SOURCE);
    this.observer = new MovableObject(INITIAL_POSITIONS.OBSERVER);

    // Link properties for direct access
    this.sourcePositionProperty = this.source.positionProperty;
    this.sourceVelocityProperty = this.source.velocityProperty;
    this.sourceMovingProperty = this.source.movingProperty;
    this.observerPositionProperty = this.observer.positionProperty;
    this.observerVelocityProperty = this.observer.velocityProperty;
    this.observerMovingProperty = this.observer.movingProperty;

    // Create the source-observer distance property
    this.sourceObserverDistanceProperty = new DerivedProperty(
      [this.sourcePositionProperty, this.observerPositionProperty],
      (sourcePosition: Vector2, observerPosition: Vector2) => {
        return sourcePosition.distance(observerPosition);
      },
    );

    // Create specialized component classes. waveformManager and dopplerCalculator
    // are constructed first because the WaveGenerator below closes over waveformManager.
    this.waveformManager = new WaveformManager(SOUND_DATA.ARRAY_SIZE);
    this.dopplerCalculator = new DopplerCalculator();

    this.waveGenerator = new WaveGenerator(
      this.waves,
      () => this.simulationTimeProperty.value,
      () => this.sourcePositionProperty.value,
      () => this.sourceVelocityProperty.value,
      () => this.emittedFrequencyProperty.value,
      () => this.soundSpeedProperty.value,
      () => this.waveformManager.getEmittedPhase(),
    );

    // Add listeners
    this.scenarioProperty.lazyLink((scenario) => {
      this.applyScenario(scenario);
    });

    this.timeSpeedProperty.lazyLink(() => {
      // Just ensure latest data is used when time speed changes
      this.updateWaveforms(0);
    });
  }

  /**
   * Reset the simulation to initial state
   */
  public reset(): void {
    // Reset properties
    this.scenarioProperty.reset();
    this.soundSpeedProperty.reset();
    this.emittedFrequencyProperty.reset();
    this.timeSpeedProperty.reset();
    this.simulationTimeProperty.reset();
    this.observedFrequencyProperty.value = PHYSICS.EMITTED_FREQ;
    this.playProperty.reset();

    // Reset microphone properties
    this.microphonePositionProperty.value = new Vector2(0, 20);
    this.microphoneEnabledProperty.reset();
    if (this.preferences) {
      this.microphoneEnabledProperty.value = this.preferences.microphoneEnabledProperty.value;
    }
    this.waveDetectedProperty.value = false;

    // Reset source and observer (also clears their trail history)
    this.source.reset(INITIAL_POSITIONS.SOURCE);
    this.observer.reset(INITIAL_POSITIONS.OBSERVER);

    // Reset velocities
    this.sourceVelocityProperty.reset();
    this.observerVelocityProperty.reset();

    this.waveformUpdateCounter = 0;

    // Clear simulation state history
    this.simulationStateHistory = [];

    // Reset components
    this.waveGenerator.reset();
    this.waveformManager.reset(SOUND_DATA.ARRAY_SIZE);
  }

  /**
   * Get the numeric value associated with the current TimeSpeed enum value
   */
  private getTimeSpeedValue(): number {
    switch (this.timeSpeedProperty.value) {
      case TimeSpeed.SLOW:
        return TIME_SPEED.SLOW;
      default:
        return TIME_SPEED.NORMAL;
    }
  }

  /**
   * Update the simulation state based on elapsed time
   * @param dt - elapsed time in seconds (real time) (s)
   * @param force - optional parameter to force stepping even when paused
   */
  public step(dt: number, force: boolean = false): void {
    if (!(this.playProperty.value || force)) {
      return;
    }

    // Apply time scaling
    const timeSpeedValue = this.getTimeSpeedValue();
    const modelDt = dt * SCALE.TIME * timeSpeedValue; // in seconds (s)

    // Check if we're reversing time
    if (modelDt < 0) {
      this.handleTimeReversal(modelDt);
      return;
    }

    // Update simulation time
    this.simulationTimeProperty.value += modelDt; // in seconds (s)
    const currentTime = this.simulationTimeProperty.value;

    // Store simulation state for time reversal
    this.storeSimulationState();

    // Update positions (also records trail history internally)
    this.source.updatePosition(modelDt, currentTime);
    this.observer.updatePosition(modelDt, currentTime);

    // Generate and update waves
    this.waveGenerator.generateWaves();
    this.waveGenerator.updateWaves(currentTime, modelDt);

    // Check for waves at microphone
    this.waveDetectedProperty.value =
      this.microphoneEnabledProperty.value &&
      this.waveGenerator.detectWaveAt(this.microphonePositionProperty.value, currentTime, modelDt);

    // Calculate Doppler effect and update waveforms
    this.updateWaveforms(modelDt);
  }

  /**
   * Handle time reversal by restoring previous simulation states
   * @param modelDt - elapsed time in seconds (model time) (s)
   */
  private handleTimeReversal(modelDt: number): void {
    // Calculate target time (negative dt means going backward)
    const targetTime = this.simulationTimeProperty.value + modelDt;

    // Find the closest state in history
    const closestState = this.findClosestState(targetTime);

    if (closestState) {
      // Restore the simulation to this state
      this.restoreSimulationState(closestState);

      // Update simulation time
      this.simulationTimeProperty.value = targetTime;

      // Update waveforms
      this.updateWaveforms(modelDt);
    } else {
      // No history available, just update time
      this.simulationTimeProperty.value = targetTime;
    }
  }

  /**
   * Store the current simulation state for time reversal
   */
  private storeSimulationState(): void {
    // Create a deep copy of the current kinematic state
    const currentState: SimulationState = {
      time: this.simulationTimeProperty.value,
      sourcePosition: this.sourcePositionProperty.value.copy(),
      observerPosition: this.observerPositionProperty.value.copy(),
      sourceVelocity: this.sourceVelocityProperty.value.copy(),
      observerVelocity: this.observerVelocityProperty.value.copy(),
    };

    // Add to history
    this.simulationStateHistory.push(currentState);

    // Limit history size
    if (this.simulationStateHistory.length > TIME_SPEED.HISTORY_BUFFER_SIZE) {
      this.simulationStateHistory.shift();
    }
  }

  /**
   * Find the closest simulation state to a target time
   * @param targetTime - The time to find the closest state for
   * @returns The closest simulation state or null if none found
   */
  private findClosestState(targetTime: number): SimulationState | null {
    // Find the closest state by time
    let closestState = this.simulationStateHistory[0];
    if (closestState === undefined) {
      return null;
    }
    let minTimeDiff = Math.abs(closestState.time - targetTime);

    for (let i = 1; i < this.simulationStateHistory.length; i++) {
      const state = this.simulationStateHistory[i];
      if (state === undefined) {
        continue;
      }
      const timeDiff = Math.abs(state.time - targetTime);

      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestState = state;
      }
    }

    return closestState;
  }

  /**
   * Restore the simulation to a previous state
   * @param state - The simulation state to restore
   */
  private restoreSimulationState(state: SimulationState): void {
    // Restore positions and velocities
    this.sourcePositionProperty.value = state.sourcePosition.copy();
    this.observerPositionProperty.value = state.observerPosition.copy();
    this.sourceVelocityProperty.value = state.sourceVelocity.copy();
    this.observerVelocityProperty.value = state.observerVelocity.copy();

    // Restore waves
    this.waveGenerator.restoreWavesFromHistory(state.time);
  }

  /**
   * Update waveforms and calculate Doppler effect
   * @param dt Elapsed model time in seconds (s)
   */
  private updateWaveforms(dt: number): void {
    // Get the current time speed factor
    const timeSpeedValue = this.getTimeSpeedValue();

    // Control how often we accumulate new waveform data points based on time speed
    this.waveformUpdateCounter += 1;

    // Calculate update interval as reciprocal of time speed factor
    // When time speed is low (0.25), update every 4 frames
    // When time speed is normal (1.0), update every frame
    const updateInterval = Math.round(TIME_SPEED.NORMAL / Math.abs(timeSpeedValue));

    if (this.waveformUpdateCounter % updateInterval === 0) {
      // Update emitted waveform
      this.waveformManager.updateEmittedWaveform(
        this.emittedFrequencyProperty.value,
        dt * updateInterval, // Compensate for skipped updates
        timeSpeedValue,
      );

      // Find waves affecting the observer
      const wavesAtObserver = this.dopplerCalculator.findWavesAtObserver(
        this.waves,
        this.observerPositionProperty.value,
        this.soundSpeedProperty.value,
        this.simulationTimeProperty.value,
      );

      // If no waves have reached observer yet, clear observed waveform
      const firstWaveAtObserver = wavesAtObserver[0];
      if (firstWaveAtObserver === undefined) {
        this.waveformManager.clearObservedWaveform();
        return;
      }

      // Use most recently arrived wave
      const currentWave = firstWaveAtObserver.wave;
      const arrivalTime = firstWaveAtObserver.arrivalTime;

      // Calculate time since wave arrival (in seconds)
      const timeSinceArrival = this.simulationTimeProperty.value - arrivalTime; // in seconds (s)

      // Get phase at arrival from original wave
      const phaseAtArrival = currentWave.phaseAtEmission;

      // Calculate Doppler frequency
      const observedFrequency = this.dopplerCalculator.calculateObservedFrequency(
        currentWave,
        this.observerPositionProperty.value,
        this.observerVelocityProperty.value,
        this.soundSpeedProperty.value,
      );

      // Update observed frequency property
      this.observedFrequencyProperty.value = observedFrequency;

      // Calculate Doppler frequency for stationary observer
      const stationaryFrequency = this.dopplerCalculator.calculateStationaryFrequency(
        currentWave,
        this.observerPositionProperty.value,
        this.soundSpeedProperty.value,
      );

      // Update observed waveform using stationary frequency since we don't want to overcount the Doppler effect
      // the change in phase is due to the change in position of the observer
      this.waveformManager.updateObservedWaveform(
        stationaryFrequency,
        phaseAtArrival,
        timeSinceArrival,
        timeSpeedValue,
        dt,
      );
    }
  }

  /**
   * Configure velocity settings for a specific scenario
   */
  private configureScenarioVelocities(scenario: Scenario): void {
    const config = SCENARIO_CONFIGS.get(scenario) ?? {
      sourceVelocity: new Vector2(0, 0),
      observerVelocity: new Vector2(0, 0),
      sourceMoving: false,
      observerMoving: false,
    };
    this.sourceVelocityProperty.value = config.sourceVelocity.copy();
    this.observerVelocityProperty.value = config.observerVelocity.copy();
    this.sourceMovingProperty.value = config.sourceMoving;
    this.observerMovingProperty.value = config.observerMoving;
  }

  /**
   * Apply the current scenario settings
   * This is called when the scenario property changes
   * @param scenario - the scenario to apply
   */
  private applyScenario(scenario: Scenario): void {
    // Apply the scenario without resetting the entire simulation

    // Reset components
    this.waveGenerator.reset();
    this.waveformManager.reset(SOUND_DATA.ARRAY_SIZE);

    // Reset positions
    this.sourcePositionProperty.value = INITIAL_POSITIONS.SOURCE;
    this.observerPositionProperty.value = INITIAL_POSITIONS.OBSERVER;

    // Configure velocities for the specific scenario
    this.configureScenarioVelocities(scenario);
  }
}
