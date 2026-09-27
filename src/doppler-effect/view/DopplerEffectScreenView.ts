import {
  type Bounds2,
  Circle,
  ComboBox,
  DerivedProperty,
  ModelViewTransform2,
  Node,
  PhetFont,
  type ProfileColorProperty,
  Property,
  ResetAllButton,
  Text,
  TimeControlNode,
  type TReadOnlyProperty,
  Vector2,
} from "scenerystack";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/DopplerEffectButtonOptions.js";
import DopplerEffectColors from "../../DopplerEffectColors.js";
import { SCALE } from "../../DopplerEffectConstants.js";
import { StringManager } from "../../i18n/StringManager.js";
import { type DopplerEffectModel, Scenario } from "../model/DopplerEffectModel.js";
import { ConnectingLineNode } from "./components/ConnectingLineNode.js";
// Import components directly
import { ControlPanelNode } from "./components/ControlPanelNode.js";
import { GraphDisplayNode } from "./components/GraphDisplayNode.js";
import { GridNode } from "./components/GridNode.js";
import { KeyboardShortcutsNode } from "./components/KeyboardShortcutsNode.js";
import { MicrophoneNode } from "./components/MicrophoneNode.js";
import { MoveableObjectView } from "./components/MoveableObjectView.js";
import { ScaleMarkNode } from "./components/ScaleMarkNode.js";
import { StatusTextNode } from "./components/StatusTextNode.js";
import { DopplerEffectScreenSummaryContent } from "./DopplerEffectScreenSummaryContent.js";
// Import managers directly
import { DragHandlerManager } from "./managers/DragHandlerManager.js";
import { KeyboardHandlerManager } from "./managers/KeyboardHandlerManager.js";
import { WaveManager } from "./managers/WaveManager.js";

// UI constants
const UI = {
  SOURCE_RADIUS: 10,
  OBSERVER_RADIUS: 10,
  GRAPH_HEIGHT: 60,
  GRAPH_WIDTH: 210,
  GRAPH_MARGIN: 20,
  GRAPH_SPACING: 10,
  TRAIL_WIDTH: 2,
} as const;

/**
 * View for the Doppler Effect simulation
 *
 * This view handles all visualization aspects of the simulation, including:
 * - Converting between model coordinates (meters) and view coordinates (pixels)
 * - Rendering the source, observer, waves, and connecting line
 * - Displaying velocity vectors and waveforms
 * - Handling user input and controls
 *
 * The view uses a ModelViewTransform2 to convert between:
 * - Model space: Physical coordinates in meters (±100m in both dimensions)
 * - View space: Screen coordinates in pixels
 */
export type DopplerEffectScreenViewOptions = ScreenViewOptions;

export class DopplerEffectScreenView extends ScreenView {
  // Model reference
  private readonly model: DopplerEffectModel;

  // Model-view transform
  private readonly modelViewTransform: ModelViewTransform2;

  // Display layers
  private readonly waveLayer: Node;
  private readonly objectLayer: Node;
  private readonly controlLayer: Node;
  private readonly graphLayer: Node;

  // UI elements
  private readonly sourceView: MoveableObjectView;
  private readonly observerView: MoveableObjectView;
  private readonly microphoneNode: MicrophoneNode;
  private readonly connectingLineNode: ConnectingLineNode;
  private readonly selectionHighlightCircle: Circle;

  // Components
  private readonly graphDisplayNode: GraphDisplayNode;
  private readonly statusDisplayNode: StatusTextNode;
  private readonly controlPanel: ControlPanelNode;
  private readonly gridNode: GridNode;
  private readonly keyboardShortcutsNode: KeyboardShortcutsNode;

  // Managers
  private readonly waveManager: WaveManager;
  private readonly sourceDragManager: DragHandlerManager;
  private readonly observerDragManager: DragHandlerManager;
  private readonly keyboardManager: KeyboardHandlerManager;

  // Visibility properties
  private readonly visibleValuesProperty: Property<boolean>;
  private readonly visibleVelocityArrowProperty: Property<boolean>;
  private readonly visibleLineOfSightProperty: Property<boolean>;
  private readonly visibleTrailsProperty: Property<boolean>;
  private readonly visibleGridProperty: Property<boolean>;
  private readonly keyboardHelpVisibleProperty: Property<boolean>;

  // Selection tracking
  private readonly selectedObjectProperty: Property<"source" | "observer"> = new Property<"source" | "observer">(
    "source",
  );

  // Derived property for interface bounds
  private readonly interfaceBoundsProperty: TReadOnlyProperty<Bounds2>;

  /**
   * Constructor for the Doppler Effect DopplerEffectScreenView
   */
  public constructor(model: DopplerEffectModel, providedOptions?: DopplerEffectScreenViewOptions) {
    // Call super first before accessing any instance properties
    const options = optionize<DopplerEffectScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        tagName: "div",
        labelTagName: "h1",
        labelContent: StringManager.getInstance().getTitleStringProperty(),
        // Localized, structured screen summary (replaces the previous hard-coded
        // English descriptionContent). Current details are derived live from the model.
        screenSummaryContent: new DopplerEffectScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    this.model = model;

    // Localized accessible names for the play-area and control nodes
    const a11yControls = StringManager.getInstance().getA11yStrings().controls;

    // Create model-view transform - y-axis is inverted and centered on the screen
    this.modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
      new Vector2(0, 0),
      this.layoutBounds.center,
      SCALE.MODEL_VIEW,
    );

    // Create property values
    this.visibleValuesProperty = new Property<boolean>(false);
    this.visibleVelocityArrowProperty = new Property<boolean>(true);
    this.visibleLineOfSightProperty = new Property<boolean>(false);
    this.visibleTrailsProperty = new Property<boolean>(false);
    this.visibleGridProperty = new Property<boolean>(false);
    this.keyboardHelpVisibleProperty = new Property<boolean>(false);

    // Matches visibleBounds horizontally, layoutBounds vertically
    this.interfaceBoundsProperty = new DerivedProperty([this.visibleBoundsProperty], (visibleBounds) =>
      visibleBounds.withMinY(this.layoutBounds.minY).withMaxY(this.layoutBounds.maxY),
    );

    // Create display layers and add to the view in correct order (waves behind objects)
    this.waveLayer = new Node();
    this.objectLayer = new Node();
    this.controlLayer = new Node();
    this.graphLayer = new Node();

    for (const layer of [this.waveLayer, this.objectLayer, this.graphLayer, this.controlLayer]) {
      this.addChild(layer);
    }

    // Create grid node
    const modelBoundsProperty = new DerivedProperty([this.visibleBoundsProperty], (visibleBounds) => {
      return this.modelViewTransform.viewToModelBounds(visibleBounds);
    });

    this.gridNode = new GridNode(this.modelViewTransform, this.visibleGridProperty, modelBoundsProperty, {
      majorGridSize: 1000, // 1000 meters between major grid lines
      minorLinesPerMajorLine: 4, // 4 minor lines between each major line
    });
    this.gridNode.setAccessibleName(a11yControls.gridStringProperty);

    // Add grid to the scene - behind the waves
    this.insertChild(0, this.gridNode);

    // common options for both source and observer
    const commonMoveableObjectViewOptions = {
      visibleVelocityArrowProperty: this.visibleVelocityArrowProperty,
      visibleTrailsProperty: this.visibleTrailsProperty,
      visibleValuesProperty: this.visibleValuesProperty,
      textColorProperty: DopplerEffectColors.textColorProperty,
      velocityScale: SCALE.VELOCITY_VECTOR,
      trailWidth: UI.TRAIL_WIDTH,
    };

    // Create source and observer views
    this.sourceView = new MoveableObjectView(this.modelViewTransform, {
      ...commonMoveableObjectViewOptions,
      radius: UI.SOURCE_RADIUS,
      fillColorProperty: DopplerEffectColors.sourceColorProperty,
      velocityArrowColorProperty: DopplerEffectColors.sourceVelocityArrowColorProperty,
      trailColorProperty: DopplerEffectColors.sourceColorProperty,
      accessibleName: StringManager.getInstance().getA11yStrings().controls.soundSourceStringProperty,
    });

    this.observerView = new MoveableObjectView(this.modelViewTransform, {
      ...commonMoveableObjectViewOptions,
      radius: UI.OBSERVER_RADIUS,
      fillColorProperty: DopplerEffectColors.observerColorProperty,
      velocityArrowColorProperty: DopplerEffectColors.observerVelocityArrowColorProperty,
      trailColorProperty: DopplerEffectColors.observerColorProperty,
      accessibleName: StringManager.getInstance().getA11yStrings().controls.observerStringProperty,
    });

    // Create connecting line using the new ConnectingLineNode class
    this.connectingLineNode = new ConnectingLineNode(
      this.modelViewTransform,
      this.model.sourcePositionProperty,
      this.model.observerPositionProperty,
      this.visibleValuesProperty,
      this.visibleLineOfSightProperty,
      this.model.sourceObserverDistanceProperty,
    );

    // Create selection highlight
    this.selectionHighlightCircle = new Circle(UI.SOURCE_RADIUS + 5, {
      stroke: DopplerEffectColors.selectionColorProperty,
      lineWidth: 2,
      // Make purely visual elements non-accessible
      tagName: null,
    });

    // Add objects to object layer
    this.objectLayer.addChild(this.connectingLineNode);
    this.objectLayer.addChild(this.selectionHighlightCircle);
    this.objectLayer.addChild(this.sourceView);
    this.objectLayer.addChild(this.observerView);

    // Create microphone node
    this.microphoneNode = new MicrophoneNode(
      this.modelViewTransform,
      this.model.microphonePositionProperty,
      this.model.waveDetectedProperty,
      // Constrain the microphone to the visible model area; follows window resizing
      // rather than being frozen to the initial layout bounds.
      modelBoundsProperty,
    );
    this.microphoneNode.setAccessibleName(a11yControls.microphoneStringProperty);
    this.objectLayer.addChild(this.microphoneNode);

    // Initialize managers
    this.waveManager = new WaveManager(this.waveLayer, this.modelViewTransform, DopplerEffectColors.waveColorProperty);

    this.sourceDragManager = new DragHandlerManager(
      this.modelViewTransform,
      this.layoutBounds,
      this.model.soundSpeedProperty,
    );
    this.observerDragManager = new DragHandlerManager(
      this.modelViewTransform,
      this.layoutBounds,
      this.model.soundSpeedProperty,
    );

    this.keyboardManager = new KeyboardHandlerManager();

    // Create graph display component
    this.graphDisplayNode = new GraphDisplayNode({
      layoutBounds: this.layoutBounds,
      graphHeight: UI.GRAPH_HEIGHT,
      graphWidth: UI.GRAPH_WIDTH,
      graphMargin: UI.GRAPH_MARGIN,
      graphSpacing: UI.GRAPH_SPACING,
    });
    this.graphDisplayNode.setAccessibleName(a11yControls.frequencyGraphsStringProperty);
    this.graphLayer.addChild(this.graphDisplayNode);

    // Create status text display
    this.statusDisplayNode = new StatusTextNode(
      this.model.observedFrequencyProperty,
      this.model.emittedFrequencyProperty,
      this.visibleValuesProperty,
      {
        layoutBounds: this.layoutBounds,
        textColorProperty: DopplerEffectColors.textColorProperty,
        blueshiftColorProperty: DopplerEffectColors.blueshiftColorProperty,
        redshiftColorProperty: DopplerEffectColors.redshiftColorProperty,
        graphWidth: UI.GRAPH_WIDTH,
        graphHeight: UI.GRAPH_HEIGHT,
        graphMargin: UI.GRAPH_MARGIN,
        graphSpacing: UI.GRAPH_SPACING,
      },
    );
    this.statusDisplayNode.setAccessibleName(a11yControls.statusInformationStringProperty);
    this.statusDisplayNode.setAriaRole("status");
    this.controlLayer.addChild(this.statusDisplayNode);

    // Create control panel
    this.controlPanel = new ControlPanelNode(
      this.visibleValuesProperty,
      this.visibleVelocityArrowProperty,
      this.visibleLineOfSightProperty,
      this.visibleTrailsProperty,
      this.visibleGridProperty,
      this.model.microphoneEnabledProperty,
      this.model.soundSpeedProperty,
      this.model.emittedFrequencyProperty,
      this.model.soundSpeedRange,
      this.model.frequencyRange,
      {
        graphRight: this.graphDisplayNode.right,
        graphBottom: this.graphDisplayNode.observedGraphBottom,
      },
    );
    this.controlPanel.setAccessibleName(a11yControls.controlPanelStringProperty);
    this.controlLayer.addChild(this.controlPanel);

    // Create scenario items for the combo box
    const scenarioItems = this.createScenarioItems(DopplerEffectColors.textColorProperty);

    const listParentNode = new Node();

    // Create combo box using SceneryStack API
    const scenarioComboBoxNode = new ComboBox(model.scenarioProperty, scenarioItems, listParentNode, {
      buttonFill: DopplerEffectColors.backgroundColorProperty,
      listFill: DopplerEffectColors.backgroundColorProperty,
      buttonStroke: DopplerEffectColors.textColorProperty,
      listStroke: DopplerEffectColors.textColorProperty,
      highlightFill: DopplerEffectColors.highlightColorProperty,
    });
    scenarioComboBoxNode.setAccessibleName(
      StringManager.getInstance().getA11yStrings().controls.scenarioSelectorStringProperty,
    );

    // Add to control layer
    this.controlLayer.addChild(scenarioComboBoxNode);
    this.controlLayer.addChild(listParentNode);
    // Setup reset all button
    const resetAllButtonNode = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput(); // Stop any ongoing interactions
        model.reset();
        this.reset();
      },
    });
    resetAllButtonNode.setAccessibleName(a11yControls.resetSimulationStringProperty);
    this.controlLayer.addChild(resetAllButtonNode);

    // Create scale mark node to show model-to-view scale
    const scaleMarkNode = new ScaleMarkNode(this.modelViewTransform, this.visibleValuesProperty, {
      scaleModelLength: 1000, // 1000 meters scale for better visibility
    });
    scaleMarkNode.setAccessibleName(a11yControls.scaleMarkStringProperty);

    // Position the scale mark
    scaleMarkNode.top = this.modelViewTransform.modelToViewY(-2000);
    this.controlLayer.addChild(scaleMarkNode);

    // Add time control node
    const timeControlNode = new TimeControlNode(this.model.playProperty, {
      tagName: "div",
      timeSpeedProperty: this.model.timeSpeedProperty,
      playPauseStepButtonOptions: {
        includeStepBackwardButton: true,
        playPauseButtonOptions: {
          startPlayingAccessibleName: a11yControls.playPauseStartStringProperty,
          endPlayingAccessibleName: a11yControls.playPauseEndStringProperty,
        },
        stepBackwardButtonOptions: {
          listener: () => {
            this.model.step(-1 / 60, true);
          },
          accessibleName: a11yControls.stepBackwardStringProperty,
        },
        stepForwardButtonOptions: {
          listener: () => {
            this.model.step(1 / 60, true);
          },
          accessibleName: a11yControls.stepForwardStringProperty,
        },
      },

      speedRadioButtonGroupOptions: {
        labelOptions: {
          fill: DopplerEffectColors.textColorProperty,
        },
      },
    });
    timeControlNode.setAccessibleName(a11yControls.simulationSpeedStringProperty);
    this.controlLayer.addChild(timeControlNode);

    // Create keyboard shortcuts node
    this.keyboardShortcutsNode = new KeyboardShortcutsNode({
      visibleProperty: this.keyboardHelpVisibleProperty,
      layoutBounds: this.layoutBounds,
    });
    this.keyboardShortcutsNode.setAccessibleName(a11yControls.keyboardShortcutsStringProperty);
    this.controlLayer.addChild(this.keyboardShortcutsNode);

    // Setup keyboard handlers
    this.keyboardManager.attachKeyboardHandlers(
      {
        onSourceSelected: () => this.updateSelectionHighlight(),
        onObserverSelected: () => this.updateSelectionHighlight(),
        onToggleTrails: () => {
          this.visibleTrailsProperty.value = !this.visibleTrailsProperty.value;
        },
        onToggleHelp: () => {
          this.keyboardHelpVisibleProperty.value = !this.keyboardHelpVisibleProperty.value;
        },
        onReset: () => {
          this.model.reset();
          this.reset();
        },
      },
      this.model.playProperty,
      this.model.sourceVelocityProperty,
      this.model.observerVelocityProperty,
      this.model.sourceMovingProperty,
      this.model.observerMovingProperty,
      this.model.emittedFrequencyProperty,
      this.model.soundSpeedProperty,
      this.model.frequencyRange,
      this.model.soundSpeedRange,
      this.model.microphoneEnabledProperty,
      this.selectedObjectProperty,
      this.model.scenarioProperty,
    );

    // Setup drag handlers
    this.sourceDragManager.attachDragHandler(
      this.sourceView.getObjectNode(),
      this.model.sourcePositionProperty,
      this.model.sourceVelocityProperty,
      this.model.sourceMovingProperty,
      () => {
        this.selectedObjectProperty.value = "source";
        this.updateSelectionHighlight();
      },
    );

    this.observerDragManager.attachDragHandler(
      this.observerView.getObjectNode(),
      this.model.observerPositionProperty,
      this.model.observerVelocityProperty,
      this.model.observerMovingProperty,
      () => {
        this.selectedObjectProperty.value = "observer";
        this.updateSelectionHighlight();
      },
    );

    // Setup model listeners
    this.addModelListeners();

    // Initial view update
    this.updateView();

    // Update microphone visibility based on enabled property
    this.microphoneNode.visible = this.model.microphoneEnabledProperty.value;
    this.model.microphoneEnabledProperty.lazyLink(() => {
      this.microphoneNode.visible = this.model.microphoneEnabledProperty.value;
    });

    // Update the interface bounds
    this.interfaceBoundsProperty.link((interfaceBounds) => {
      resetAllButtonNode.right = interfaceBounds.right - 10;
      resetAllButtonNode.bottom = interfaceBounds.bottom - 10;
      this.graphLayer.right = interfaceBounds.right - 10;
      this.graphLayer.top = interfaceBounds.top + 10;
      this.controlPanel.right = interfaceBounds.right - 10;
      this.controlPanel.top = this.graphLayer.bottom + 10;
      timeControlNode.centerX = interfaceBounds.centerX;
      timeControlNode.bottom = interfaceBounds.bottom - 10;
      scenarioComboBoxNode.left = interfaceBounds.minX + 10;
      scenarioComboBoxNode.top = interfaceBounds.top + 10;
      scaleMarkNode.right = resetAllButtonNode.left - 30;
    });

    // ── Accessibility: keyboard / reading traversal order ───────────────────────
    // Make Tab/reading order deterministic: the play-area objects (draggable
    // source and observer) before the controls. ScreenView throws if you set
    // pdomOrder on itself, so use a wrapper Node.
    this.addChild(
      new Node({
        pdomOrder: [this.objectLayer, this.controlLayer],
      }),
    );
  }

  /**
   * Reset the view to initial state
   */
  public reset(): void {
    // Reset selected object
    this.selectedObjectProperty.reset();

    // Reset property values
    this.visibleValuesProperty.reset();
    this.visibleVelocityArrowProperty.reset();
    this.visibleLineOfSightProperty.reset();
    this.visibleTrailsProperty.reset();
    this.visibleGridProperty.reset();
    this.keyboardHelpVisibleProperty.reset();

    // Reset components
    this.waveManager.clearWaveNodes();
    this.graphDisplayNode.reset();

    // Update microphone visibility
    this.microphoneNode.visible = this.model.microphoneEnabledProperty.value;

    // Update microphone position to match model's reset position
    const micViewPos = this.modelViewTransform.modelToViewPosition(this.model.microphonePositionProperty.value);
    this.microphoneNode.center = micViewPos;

    // Update view to match model
    this.updateView();
  }

  /**
   * Main step function called each frame
   */
  public override step(): void {
    // Update view to match model
    this.updateView();
  }

  /**
   * Add model listeners
   */
  private addModelListeners(): void {
    // Per-frame rendering is driven by step() (called every animation frame by the
    // framework), so positions, velocities and trails are repainted there. Linking
    // updateView() to each of the position/velocity properties as well would repaint
    // the whole scene several extra times per simulation step for no visible benefit.

    // Listen for changes to wave collection
    this.model.waves.addItemAddedListener((wave) => {
      this.waveManager.addWaveNode(wave);
    });

    this.model.waves.addItemRemovedListener((wave) => {
      this.waveManager.removeWaveNode(wave);
    });

    // Update waveforms when model changes
    this.model.simulationTimeProperty.link(() => {
      this.graphDisplayNode.updateWaveforms(this.model.emittedWaveformData, this.model.observedWaveformData);
    });

    // Note: the click sound on wave detection is played by MicrophoneNode, which owns
    // the microphone's detection feedback. Playing it here as well would double the click.
  }

  /**
   * Update the view
   */
  private updateView(): void {
    // Update object positions and velocities and trails
    this.sourceView.update(
      this.model.sourcePositionProperty.value,
      this.model.sourceVelocityProperty.value,
      this.model.sourceTrail,
    );
    this.observerView.update(
      this.model.observerPositionProperty.value,
      this.model.observerVelocityProperty.value,
      this.model.observerTrail,
    );

    // Update selection highlight
    this.updateSelectionHighlight();

    // Update waves
    this.waveManager.updateWaves(this.model.waves, this.model.simulationTimeProperty.value);
  }

  /**
   * Update the selection highlight position and size
   */
  private updateSelectionHighlight(): void {
    if (this.selectedObjectProperty.value === "source") {
      this.selectionHighlightCircle.radius = UI.SOURCE_RADIUS + 5;
      this.selectionHighlightCircle.center = this.modelViewTransform.modelToViewPosition(
        this.model.sourcePositionProperty.value,
      );
    } else {
      this.selectionHighlightCircle.radius = UI.OBSERVER_RADIUS + 5;
      this.selectionHighlightCircle.center = this.modelViewTransform.modelToViewPosition(
        this.model.observerPositionProperty.value,
      );
    }
  }

  /**
   * Create scenario items for the combo box
   * @param textColorProperty - The color property for the scenario text
   * @returns Array of scenario items for the combo box
   */
  private createScenarioItems(textColorProperty: ProfileColorProperty): { value: Scenario; createNode: () => Text }[] {
    // Generate items by iterating through the scenario enumeration
    // Use the displayNameProperty from each Scenario instance
    return Scenario.enumeration.values.map((scenario) => ({
      value: scenario,
      createNode: () =>
        new Text(scenario.displayNameProperty, {
          font: new PhetFont(14),
          fill: textColorProperty,
        }),
    }));
  }
}
