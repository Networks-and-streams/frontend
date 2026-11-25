import type { ElementDefinition } from 'cytoscape';
import type { AlgorithmStep, GraphInput, MintyResult, MintyStep, SolverResult } from '../types';
import { isFlowResult, isFlowStep } from '../types';
import type { ViewMode } from '../store/computeResultStore';

/**
 * Domain → Cytoscape adapter.
 *
 * This is the only place that knows how the graph domain model maps onto
 * Cytoscape element definitions. It is a pure mapping: no Cytoscape instance
 * or state is created here, and the domain types / Zustand stores remain free
 * of Cytoscape-specific types.
 */

/** Cytoscape node id for a 1-based graph vertex. */
export function graphNodeId(vertex: number): string {
	return `v${vertex}`;
}

/** Cytoscape edge id — includes the edge index so parallel edges stay distinct. */
export function graphEdgeId(from: number, to: number, index: number): string {
	return `e${from}-${to}-${index}`;
}

function isVertexInRange(vertex: number, vertices: number): boolean {
	return Number.isInteger(vertex) && vertex >= 1 && vertex <= vertices;
}

/**
 * Maps a {@link GraphInput} to Cytoscape element definitions.
 * Edges that reference a missing vertex are skipped defensively.
 */
export function toCytoscapeElements(graph: GraphInput): ElementDefinition[] {
	const nodes: ElementDefinition[] = [];
	for (let vertex = 1; vertex <= graph.vertices; vertex += 1) {
		nodes.push({
			data: { id: graphNodeId(vertex), label: String(vertex) },
			classes: vertex === graph.source ? 'source' : undefined,
		});
	}

	const edges: ElementDefinition[] = [];
	graph.edges.forEach((edge, index) => {
		if (!isVertexInRange(edge.from, graph.vertices) || !isVertexInRange(edge.to, graph.vertices)) {
			return;
		}
		edges.push({
			data: {
				id: graphEdgeId(edge.from, edge.to, index),
				source: graphNodeId(edge.from),
				target: graphNodeId(edge.to),
				label: String(edge.weight),
			},
		});
	});

	return [...nodes, ...edges];
}

export interface ResultHighlight {
	nodeIds: string[];
	edgeIds: string[];
}

/** Indexes the drawable edges by "from->to" so a path maps back to edge id(s). */
function indexEdgesByPair(graph: GraphInput): Map<string, string[]> {
	const edgesByPair = new Map<string, string[]>();
	graph.edges.forEach((edge, index) => {
		if (!isVertexInRange(edge.from, graph.vertices) || !isVertexInRange(edge.to, graph.vertices)) {
			return;
		}
		const key = `${edge.from}->${edge.to}`;
		const id = graphEdgeId(edge.from, edge.to, index);
		const existing = edgesByPair.get(key);
		if (existing) existing.push(id);
		else edgesByPair.set(key, [id]);
	});
	return edgesByPair;
}

/** Edge ids of the consecutive steps of one path (parallel edges all match). */
function pathEdgeIds(edgesByPair: Map<string, string[]>, path: number[]): string[] {
	const ids = new Set<string>();
	for (let step = 0; step + 1 < path.length; step += 1) {
		edgesByPair.get(`${path[step]}->${path[step + 1]}`)?.forEach((id) => ids.add(id));
	}
	return [...ids];
}

/**
 * Derives the element ids that participate in the computed shortest paths
 * (Minty result: every tied route to every reachable vertex) so the
 * visualization can highlight them.
 */
export function collectResultHighlight(
	graph: GraphInput,
	result: MintyResult | null | undefined,
): ResultHighlight {
	const paths = result?.paths;
	if (!paths) return { nodeIds: [], edgeIds: [] };

	const edgesByPair = indexEdgesByPair(graph);
	const nodeIds = new Set<string>();
	const edgeIds = new Set<string>();

	for (const routes of Object.values(paths)) {
		for (const path of routes) {
			path.forEach((vertex) => nodeIds.add(graphNodeId(vertex)));
			pathEdgeIds(edgesByPair, path).forEach((id) => edgeIds.add(id));
		}
	}

	return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] };
}

/*
 * ---------------------------------------------------------------------------
 * Max-flow / min-cut trace overlay (expansion plan §3.5)
 * ---------------------------------------------------------------------------
 */

/** Visual state derived from the solution + the currently displayed frame. */
export interface TraceOverlay {
	/** edgeId → `flow/capacity` label (empty for non-flow results). */
	edgeLabels: Map<string, string>;
	/** edgeId → flow/capacity numbers used to scale the stroke width. */
	edgeFlows: Map<string, { flow: number; capacity: number }>;
	/** Edges carrying their full capacity. */
	saturatedEdgeIds: string[];
	/** Edges crossing the minimum s–t cut (rendered red/dashed). */
	cutEdgeIds: string[];
	sourceSideNodeIds: string[];
	sinkSideNodeIds: string[];
	/** The augmenting path of the displayed frame. */
	activePathNodeIds: string[];
	activePathEdgeIds: string[];
	/** Minty frame: vertices visited so far (+ the current one). */
	visitedNodeIds: string[];
	currentNodeId: string | null;
	/** Detailed frame: nodeId → mark value (`null` = ∞) of labeled vertices. */
	nodeMarks: Map<string, number | null>;
	/** Labeled (розмічені) vertices of the displayed frame. */
	labeledNodeIds: string[];
	/** Not yet labeled (нерозмічені) vertices — muted on the canvas. */
	unlabeledNodeIds: string[];
	/** Reverse chain of a `reverse` frame (sink … source). */
	reversePathNodeIds: string[];
	reversePathEdgeIds: string[];
}

export function emptyTraceOverlay(): TraceOverlay {
	return {
		edgeLabels: new Map(),
		edgeFlows: new Map(),
		saturatedEdgeIds: [],
		cutEdgeIds: [],
		sourceSideNodeIds: [],
		sinkSideNodeIds: [],
		activePathNodeIds: [],
		activePathEdgeIds: [],
		visitedNodeIds: [],
		currentNodeId: null,
		nodeMarks: new Map(),
		labeledNodeIds: [],
		unlabeledNodeIds: [],
		reversePathNodeIds: [],
		reversePathEdgeIds: [],
	};
}

/** Edge id by its position in the input edge list (defensive against edits). */
function edgeIdByIndex(graph: GraphInput, index: number): string | null {
	const edge = graph.edges[index];
	if (!edge) return null;
	if (!isVertexInRange(edge.from, graph.vertices) || !isVertexInRange(edge.to, graph.vertices)) return null;
	return graphEdgeId(edge.from, edge.to, index);
}

/**
 * Builds the overlay for one displayed trace frame.
 *
 * - flow labels/saturated/active path come from the frame's flow snapshot
 *   (never the final one) so the animation shows the real intermediate state;
 * - the cut is taken from the frame when present (the backend attaches it to
 *   the final frame) and falls back to the result;
 * - `viewMode` decides whether the flow decorations and/or the cut decorations
 *   are produced at all.
 */
export function buildTraceOverlay(
	graph: GraphInput,
	result: SolverResult | null | undefined,
	step: AlgorithmStep | null | undefined,
	viewMode: ViewMode = 'both',
): TraceOverlay {
	const overlay = emptyTraceOverlay();

	if (!isFlowResult(result)) {
		// Minty frame: only the visited-set decoration applies.
		if (step && !isFlowStep(step)) {
			const mintyStep = step as MintyStep;
			overlay.visitedNodeIds = mintyStep.visited.map(graphNodeId);
			overlay.currentNodeId = mintyStep.current === null ? null : graphNodeId(mintyStep.current);
		}
		return overlay;
	}

	const isFlowFrame = isFlowStep(step);
	const frame = isFlowFrame ? step : null;

	// Capacities always come from the final result (they never change).
	const capacityByIndex = new Map<number, number>();
	result.flows.forEach((edge) => {
		if (edge.index !== undefined) capacityByIndex.set(edge.index, edge.capacity);
	});

	// Flows of the displayed frame (or the finished solution without a trace).
	// Skipped entirely in `cut` view so the canvas shows only the partition.
	if (viewMode !== 'cut') {
		const flows = frame?.flows ?? result.flows;
		flows.forEach((snapshot) => {
			const index = snapshot.index;
			const id = index !== undefined ? edgeIdByIndex(graph, index) : null;
			if (!id) return;
			const capacity = capacityByIndex.get(index as number) ?? graph.edges[index as number]?.weight ?? 0;
			overlay.edgeLabels.set(id, `${snapshot.flow}/${capacity}`);
			overlay.edgeFlows.set(id, { flow: snapshot.flow, capacity });
			if (capacity > 0 && snapshot.flow === capacity) overlay.saturatedEdgeIds.push(id);
		});
	}

	if (viewMode !== 'flow') {
		const cut = frame?.min_cut ?? result.min_cut;
		if (cut) {
			cut.edges.forEach((cutEdge) => {
				const id = cutEdge.index !== undefined ? edgeIdByIndex(graph, cutEdge.index) : null;
				if (id) overlay.cutEdgeIds.push(id);
			});
			overlay.sourceSideNodeIds = cut.source_side.map(graphNodeId);
			overlay.sinkSideNodeIds = cut.sink_side.map(graphNodeId);
		}
	}

	if (viewMode !== 'cut' && frame && frame.augmenting_path.length >= 2) {
		const path = frame.augmenting_path;
		overlay.activePathNodeIds = path.map(graphNodeId);
		overlay.activePathEdgeIds = pathEdgeIds(indexEdgesByPair(graph), path);
	}

	// Detailed Ford–Fulkerson frames: marks, the labeled/unlabeled partition
	// and the growing reverse chain (flow-process info — hidden in `cut`
	// view, which only shows the finished partition).
	if (viewMode !== 'cut' && frame && frame.labeled) {
		frame.marks?.forEach((mark) => overlay.nodeMarks.set(graphNodeId(mark.vertex), mark.mark));
		overlay.labeledNodeIds = frame.labeled.map(graphNodeId);
		// On the final frame the unlabeled set IS the sink side of the cut:
		// dimming it would fight the cut partition, so it stays undimmed.
		if (frame.kind !== 'final') {
			overlay.unlabeledNodeIds = (frame.unlabeled ?? []).map(graphNodeId);
		}
		if (frame.computation) overlay.currentNodeId = graphNodeId(frame.computation.to);
		if (frame.kind === 'reverse') {
			const chain = frame.reverse_path ?? [];
			overlay.reversePathNodeIds = chain.map(graphNodeId);
			if (chain.length >= 2) {
				// The chain runs sink → source; edges are indexed source → sink.
				overlay.reversePathEdgeIds = pathEdgeIds(indexEdgesByPair(graph), [...chain].reverse());
			}
		}
	}

	return overlay;
}

/**
 * Stable signature of the element ids. Used to relayout only when the
 * node/edge set changes — data-only edits (e.g. a weight) do not move nodes.
 */
export function elementStructureSignature(elements: ElementDefinition[]): string {
	return elements
		.map((element) => String(element.data.id))
		.sort()
		.join('|');
}
