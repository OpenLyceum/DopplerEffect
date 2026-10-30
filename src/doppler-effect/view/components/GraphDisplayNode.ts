/**
 * GraphDisplayNode.ts
 *
 * Contains the graph display functionality for the Doppler Effect simulation,
 * including emitted and observed waveforms.
 *
 * Features:
 * - A shared, uniform time axis: each graph spans WAVEFORM.TIME_WINDOW of model time,
 *   with the present at the right edge and a grid line every WAVEFORM.GRID_INTERVAL
 * - Crests of the traces are wavefronts (leaving the source / passing the observer)
 * - Encapsulated graph element creation for emitted and observed sound
 */

import {
  type Bounds2,
  Node,
  Path,
  PhetFont,
  type ProfileColorProperty,
  type ReadOnlyProperty,
  Rectangle,
  Shape,
  Text,
} from "scenerystack";
import DopplerEffectColors from "../../../DopplerEffectColors.js";
import { WAVEFORM, type WaveformPoint } from "../../../DopplerEffectConstants.js";
import { StringManager } from "../../../i18n/StringManager.js";

// Constants for layout positioning and styling
const GRAPH_TITLE_GAP = 2; // Gap between a graph's title and its top edge, px
const GRAPH_INITIAL_Y = 30;
const WAVEFORM_LINE_WIDTH = 2;
const TITLE_FONT_SIZE = 12;
const AMPLITUDE_FRACTION = 0.4; // Peak amplitude as a fraction of the graph height (dimensionless)
const TIME_GRID_LINE_WIDTH = 0.5;

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
  grid: Path;
  waveform: Path;
  title: Node;
}

/**
 * Component that renders the waveform graphs for the simulation
 * Displays both emitted and observed sound waveforms on a shared time axis.
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

    // Each graph's title sits above it, so the spacing makes room for the second title
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
   * Encapsulates the creation of a complete graph with container, center line and
   * time grid, waveform, and title.
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

    // Center line, and a vertical line every GRID_INTERVAL back from the present (right edge)
    const gridShape = new Shape().moveTo(graphX, graphY + height / 2).horizontalLineToRelative(width);
    for (let age = WAVEFORM.GRID_INTERVAL; age < WAVEFORM.TIME_WINDOW; age += WAVEFORM.GRID_INTERVAL) {
      const x = graphX + width * (1 - age / WAVEFORM.TIME_WINDOW);
      gridShape.moveTo(x, graphY).verticalLineToRelative(height);
    }
    const grid = new Path(gridShape, { stroke: gridColorProperty, lineWidth: TIME_GRID_LINE_WIDTH });

    // Create waveform path, clipped so a trace never spills past the graph's edges
    const waveform = new Path(new Shape(), {
      stroke: waveformColorProperty,
      lineWidth: WAVEFORM_LINE_WIDTH,
      clipArea: Shape.rect(graphX, graphY, width, height),
    });

    // Title above the graph, clear of the trace
    const title = new Text(titleProperty, {
      font: new PhetFont(TITLE_FONT_SIZE),
      fill: textColorProperty,
      maxWidth: width,
      left: graphX,
      bottom: graphY - GRAPH_TITLE_GAP,
    });

    return { rect, grid, waveform, title };
  }

  /**
   * Add graph elements to this node
   *
   * @param config - Graph configuration
   */
  private addGraphElements(config: GraphConfig): void {
    this.addChild(config.rect);
    this.addChild(config.grid);
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
    this.emittedWaveform.shape = this.createWaveformShape(this.emittedGraph, emittedWaveformData);
    this.observedWaveform.shape = this.createWaveformShape(this.observedGraph, observedWaveformData);
  }

  /**
   * Create a waveform shape from waveform data. Each point's t (0 = TIME_WINDOW ago, 1 = now)
   * maps across the graph, and its amplitude to AMPLITUDE_FRACTION of the graph height.
   *
   * @param graph - The graph's container rectangle
   * @param waveformData - The waveform data to render
   * @returns A Shape object representing the waveform
   */
  private createWaveformShape(graph: Rectangle, waveformData: WaveformPoint[]): Shape {
    const shape = new Shape();
    const amplitude = graph.height * AMPLITUDE_FRACTION; // px

    waveformData.forEach((point, index) => {
      const x = graph.left + point.t * graph.width;
      const y = graph.centerY - point.y * amplitude;
      if (index === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    });

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
