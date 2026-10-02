/**
 * GraphDisplayNode.ts
 *
 * Contains the graph display functionality for the Doppler Effect simulation,
 * including emitted and observed waveforms.
 *
 * Features:
 * - Right-aligned waveforms that ensure current time is at the right edge
 * - Y-axis scaling for better waveform visualization
 * - Encapsulated graph element creation for emitted and observed sound
 */

import {
  type Bounds2,
  Line,
  Node,
  Path,
  PhetFont,
  type ProfileColorProperty,
  type ReadOnlyProperty,
  Rectangle,
  Shape,
  Text,
  Vector2,
} from "scenerystack";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { StringManager } from "../../../i18n/StringManager.js";

// Constants for layout positioning and styling
const GRAPH_TITLE_OFFSET_X = 5;
const GRAPH_TITLE_OFFSET_Y = 15;
const GRAPH_INITIAL_Y = 30;
const WAVEFORM_LINE_WIDTH = 2;
const TITLE_FONT_SIZE = 12;
/** Padding and opacity of the backing behind each graph title. */
const TITLE_BACKING_MARGIN = 2;
const TITLE_BACKING_OPACITY = 0.85;
const WAVEFORM_Y_SCALING = 20; // Scaling factor for Y-axis amplitude

// Waveform data from the model
export type WaveformPoint = {
  t: number; // Time in seconds (s)
  y: number; // Amplitude (dimensionless)
};

// Configuration options for the graph display
type GraphDisplayOptions = {
  layoutBounds: Bounds2;
  graphHeight: number;
  graphWidth: number;
  graphMargin: number;
  graphSpacing: number;
};

// Type for defining a graph's positioning and properties
interface GraphConfig {
  rect: Rectangle;
  centerLine: Line;
  waveform: Path;
  title: Node;
}

/**
 * Component that renders the waveform graphs for the simulation
 * Displays both emitted and observed sound waveforms with right-alignment
 * and amplitude scaling.
 */
export class GraphDisplayNode extends Node {
  // Graph components
  private readonly emittedGraph: Rectangle;
  private readonly observedGraph: Rectangle;
  private readonly emittedWaveform: Path;
  private readonly observedWaveform: Path;

  // String manager instance
  private readonly stringManager: StringManager = StringManager.getInstance();

  /**
   * Constructor for the GraphDisplayNode
   *
   * @param options - Configuration options
   */
  constructor(options: GraphDisplayOptions) {
    super();

    // Get strings from string manager
    const strings = this.stringManager.getGraphDisplayStrings();

    const graphY1 = GRAPH_INITIAL_Y;
    const graphY2 = graphY1 + options.graphHeight + options.graphSpacing;
    const graphX = options.layoutBounds.maxX - options.graphWidth - options.graphMargin;

    // Create emitted sound graph elements
    const emittedGraphConfig = this.createGraphElements(
      graphX,
      graphY1,
      options.graphWidth,
      options.graphHeight,
      DopplerEffectColors.graphBackgroundColorProperty,
      DopplerEffectColors.graphGridColorProperty,
      DopplerEffectColors.sourceColorProperty,
      strings.emittedSoundStringProperty,
      DopplerEffectColors.textColorProperty,
    );

    // Create observed sound graph elements
    const observedGraphConfig = this.createGraphElements(
      graphX,
      graphY2,
      options.graphWidth,
      options.graphHeight,
      DopplerEffectColors.graphBackgroundColorProperty,
      DopplerEffectColors.graphGridColorProperty,
      DopplerEffectColors.observerColorProperty,
      strings.observedSoundStringProperty,
      DopplerEffectColors.textColorProperty,
    );

    // Store references to main components
    this.emittedGraph = emittedGraphConfig.rect;
    this.observedGraph = observedGraphConfig.rect;
    this.emittedWaveform = emittedGraphConfig.waveform;
    this.observedWaveform = observedGraphConfig.waveform;

    // Add all components to this node
    this.addGraphElements(emittedGraphConfig);
    this.addGraphElements(observedGraphConfig);
  }

  /**
   * Create all elements for a graph
   * Encapsulates the creation of a complete graph with container, center line,
   * waveform, and title.
   *
   * @param graphX - X position of the graph
   * @param graphY - Y position of the graph
   * @param width - Width of the graph
   * @param height - Height of the graph
   * @param backgroundColorProperty - Background color property of the graph
   * @param gridColorProperty - Color property of grid lines
   * @param waveformColorProperty - Color property of the waveform
   * @param titleProperty - Title text property
   * @param textColorProperty - Color property of the title text
   * @returns Graph configuration object
   */
  private createGraphElements(
    graphX: number,
    graphY: number,
    width: number,
    height: number,
    backgroundColorProperty: ProfileColorProperty,
    gridColorProperty: ProfileColorProperty,
    waveformColorProperty: ProfileColorProperty,
    titleProperty: ReadOnlyProperty<string>,
    textColorProperty: ProfileColorProperty,
  ): GraphConfig {
    // Create graph container
    const rect = new Rectangle(graphX, graphY, width, height, {
      fill: backgroundColorProperty,
      stroke: gridColorProperty,
    });

    // Create center line
    const centerLine = new Line(graphX, graphY + height / 2, graphX + width, graphY + height / 2, {
      stroke: gridColorProperty,
    });

    // Create waveform path
    const waveform = new Path(new Shape(), {
      stroke: waveformColorProperty,
      lineWidth: WAVEFORM_LINE_WIDTH,
    });

    // Create title, on a backing in the graph's own colour so the trace drawn
    // underneath it cannot run through the text.
    const titleText = new Text(titleProperty, {
      font: new PhetFont(TITLE_FONT_SIZE),
      fill: textColorProperty,
    });
    const titleBacking = new Rectangle(0, 0, 1, 1, { fill: backgroundColorProperty, opacity: TITLE_BACKING_OPACITY });
    titleText.localBoundsProperty.link((bounds) => {
      titleBacking.rectBounds = bounds.dilated(TITLE_BACKING_MARGIN);
    });
    const title = new Node({
      children: [titleBacking, titleText],
      left: graphX + GRAPH_TITLE_OFFSET_X,
      top: graphY + GRAPH_TITLE_OFFSET_Y,
    });

    return { rect, centerLine, waveform, title };
  }

  /**
   * Add graph elements to this node
   *
   * @param config - Graph configuration
   */
  private addGraphElements(config: GraphConfig): void {
    this.addChild(config.rect);
    this.addChild(config.centerLine);
    this.addChild(config.waveform);
    this.addChild(config.title);
  }

  /**
   * Right edge of the graphs, in this node's parent coordinates
   */
  public get graphRight(): number {
    return this.emittedGraph.right;
  }

  /**
   * Get the bottom edge position of the observed graph
   */
  public get observedGraphBottom(): number {
    return this.observedGraph.bottom;
  }

  /**
   * Update the waveforms based on model data
   *
   * @param emittedWaveformData - Data for the emitted waveform
   * @param observedWaveformData - Data for the observed waveform
   */
  public updateWaveforms(emittedWaveformData: WaveformPoint[], observedWaveformData: WaveformPoint[]): void {
    // Update emitted sound waveform
    this.emittedWaveform.shape = this.createWaveformShape(
      this.emittedGraph.left,
      this.emittedGraph.centerY,
      this.emittedGraph.width,
      emittedWaveformData,
    );

    // Update observed sound waveform
    this.observedWaveform.shape = this.createWaveformShape(
      this.observedGraph.left,
      this.observedGraph.centerY,
      this.observedGraph.width,
      observedWaveformData,
    );
  }

  /**
   * Find the maximum t value in waveform data
   * Used to ensure right-alignment of waveforms
   *
   * @param waveformData - Array of waveform data points
   * @returns Maximum t value
   */
  private findMaxT(waveformData: WaveformPoint[]): number {
    let maxT = 0;
    for (const point of waveformData) {
      maxT = Math.max(maxT, point.t);
    }
    return maxT;
  }

  /**
   * Create a waveform shape from waveform data
   * Applies right-alignment so current time is at the right edge of the graph.
   * Also applies Y-scaling factor to amplify the waveform for better visualization.
   *
   * @param graphX - The x-coordinate of the left edge of the graph
   * @param graphY - The y-coordinate of the center of the graph
   * @param graphWidth - The width of the graph
   * @param waveformData - The waveform data to render
   * @returns A Shape object representing the waveform
   */
  private createWaveformShape(
    graphX: number,
    graphY: number,
    graphWidth: number,
    waveformData: WaveformPoint[],
  ): Shape {
    const shape = new Shape();

    // Find the maximum t value to ensure right alignment
    const maxT = this.findMaxT(waveformData);

    // Start at left edge
    shape.moveToPoint(new Vector2(graphX, graphY));

    let firstValidPointFound = false;

    for (const point of waveformData) {
      // Right-align the waveform by scaling the t values relative to maxT
      // This ensures the current time (latest point) is always at the right edge
      const normalizedT = maxT > 0 ? point.t / maxT : 0;
      const tRatio = Math.max(0, Math.min(1, normalizedT));
      const x = graphX + tRatio * graphWidth;

      // Apply Y-scaling factor to amplify the waveform amplitude
      const y = graphY - point.y * WAVEFORM_Y_SCALING;

      if (!firstValidPointFound) {
        shape.moveToPoint(new Vector2(x, y));
        firstValidPointFound = true;
      } else {
        shape.lineToPoint(new Vector2(x, y));
      }
    }

    return shape;
  }

  /**
   * Reset the waveforms
   */
  public reset(): void {
    this.emittedWaveform.shape = new Shape();
    this.observedWaveform.shape = new Shape();
  }
}
