/**
 * Graph domain types.
 *
 * The compute contract is `POST /graph/compute` (backend `src/graph/`), which
 * proxies the Rust compute service over gRPC and returns the already parsed
 * `{ status, algorithm, result, steps }` envelope documented below.
 */

export interface GraphEdge {
	from: number;
	to: number;
	weight: number;
}

export interface GraphInput {
	vertices: number;
	edges: GraphEdge[];
	source: number;
}

export const GRAPH_ALGORITHM = {
	MINTY: 'minty',
	FORD_FULKERSON: 'ford_fulkerson',
	EDMONDS_KARP: 'edmonds_karp',
} as const;
export type GraphAlgorithm = (typeof GRAPH_ALGORITHM)[keyof typeof GRAPH_ALGORITHM];

/** Algorithms that compute a maximum flow (both require a sink vertex). */
export type FlowAlgorithm = typeof GRAPH_ALGORITHM.FORD_FULKERSON | typeof GRAPH_ALGORITHM.EDMONDS_KARP;

export function isFlowAlgorithm(algorithm: GraphAlgorithm | string): algorithm is FlowAlgorithm {
	return algorithm === GRAPH_ALGORITHM.FORD_FULKERSON || algorithm === GRAPH_ALGORITHM.EDMONDS_KARP;
}

/** Request shape for `POST /graph/compute`. */
export interface ComputeRequest {
	algorithm: GraphAlgorithm;
	graph: GraphInput;
	/** 1-based sink vertex — required by the backend for flow algorithms. */
	sink?: number;
	options?: {
		includeSteps?: boolean;
	};
}

/*
 * Response payloads (backend contract, expansion plan §2.2/§3.1).
 *
 * The backend returns the already parsed JSON: `{ status, algorithm, result,
 * steps }` — never the raw `result_json`/`steps_json` strings.
 */

/** Minty: shortest distances plus every tied shortest route. */
export interface MintyResult {
	source: number;
	/** Shortest distance per vertex; `null` when the vertex is unreachable. */
	distances: Record<string, number | null>;
	/** All tied shortest routes per target vertex (1-based vertex ids). */
	paths: Record<string, number[][]>;
	/** True when more tied routes exist than the backend returned. */
	truncated: boolean;
}

/** Flow on a single input edge (`index` = position in the input edge list). */
export interface FlowEdgeResult {
	index?: number;
	from: number;
	to: number;
	flow: number;
	capacity: number;
}

/** An edge crossing the minimum s–t cut. */
export interface CutEdgeResult {
	index?: number;
	from: number;
	to: number;
	capacity: number;
}

/** Minimum s–t cut derived from the final residual network. */
export interface MinCutResult {
	value: number;
	source_side: number[];
	sink_side: number[];
	edges: CutEdgeResult[];
}

/** Result of `ford_fulkerson` (DFS) / `edmonds_karp` (BFS). */
export interface FordFulkersonResult {
	algorithm: FlowAlgorithm;
	mode: 'dfs' | 'bfs';
	max_flow: number;
	source: number;
	sink: number;
	flows: FlowEdgeResult[];
	min_cut: MinCutResult;
}

/** Flow snapshot of every input edge at one point of the computation. */
export interface FlowSnapshot {
	index?: number;
	from: number;
	to: number;
	flow: number;
}

/** What a detailed flow trace frame shows (Ford–Fulkerson only). */
export type FlowFrameKind = 'label' | 'reverse' | 'augment' | 'final';

/** A vertex's mark (мітка) at one point of the labeling stage. */
export interface VertexMark {
	vertex: number;
	/** `null` = ∞ (only the source carries it). */
	mark: number | null;
}

/** One labeling action: vertex `to` gets its mark from vertex `from`. */
export interface LabelComputation {
	from: number;
	to: number;
	/** Mark of `from`; `null` = ∞. */
	mark_from: number | null;
	/** Residual capacity of the used arc (c − f forward, f backward). */
	residual: number;
	/** New mark of `to` = min(mark_from, residual). */
	mark_to: number;
	/** Position of the input edge whose residual arc was used. */
	edge_index: number;
	/** True when a backward residual arc was used. */
	backward: boolean;
}

/** One animation frame of the max-flow trace. */
export interface FlowStep {
	/** 1-based frame number across the whole trace. */
	iteration: number;
	/** 1-based stage — detailed Ford–Fulkerson trace only. */
	stage?: number;
	/** 1-based step inside its stage — detailed Ford–Fulkerson trace only. */
	stage_step?: number;
	/** What the frame shows — detailed Ford–Fulkerson trace only. */
	kind?: FlowFrameKind;
	/** Every mark at this moment (sorted by vertex) — detailed trace only. */
	marks?: VertexMark[];
	/** Marked vertices (розмічені), ascending — detailed trace only. */
	labeled?: number[];
	/** Not yet marked vertices (нерозмічені), ascending — detailed trace only. */
	unlabeled?: number[];
	/** Labeling computation of a `label` frame — detailed trace only. */
	computation?: LabelComputation;
	/** Reverse chain so far, sink … source — detailed trace only. */
	reverse_path?: number[];
	/** Vertices of the augmenting path; empty on the final step. */
	augmenting_path: number[];
	/** Flow pushed along the path (0 on the final step). */
	bottleneck: number;
	/** Edge flows AFTER this step. */
	flows: FlowSnapshot[];
	max_flow_so_far: number;
	/** Present only on the final step (the cut to render). */
	min_cut?: MinCutResult;
}

/** One animation frame of the Minty trace. */
export interface MintyStep {
	current: number | null;
	visited: number[];
	distances: Record<string, number | null>;
}

/** Union of both result families. */
export type SolverResult = MintyResult | FordFulkersonResult;

/** Narrowing helper: a flow result carries `max_flow`. */
export function isFlowResult(result: SolverResult | null | undefined): result is FordFulkersonResult {
	return !!result && typeof (result as FordFulkersonResult).max_flow === 'number';
}

/** Narrowing helper: flow trace frames carry `augmenting_path`. */
export function isFlowStep(step: AlgorithmStep | null | undefined): step is FlowStep {
	return !!step && Array.isArray((step as FlowStep).augmenting_path);
}

/**
 * Narrowing helper: a detailed Ford–Fulkerson frame belongs to a stage and
 * carries its kind. Edmonds–Karp frames stay flat (`stage === undefined`).
 */
export function isDetailedFlowStep(
	step: AlgorithmStep | null | undefined,
): step is FlowStep & { stage: number; stage_step: number; kind: FlowFrameKind } {
	return (
		isFlowStep(step) &&
		typeof step.stage === 'number' &&
		typeof step.stage_step === 'number' &&
		step.kind !== undefined
	);
}

export type AlgorithmStep = FlowStep | MintyStep;

/** Success envelope of `POST /graph/compute`. */
export interface ComputeResponse {
	status: 'ok';
	algorithm: GraphAlgorithm;
	result: SolverResult;
	steps: AlgorithmStep[];
}

/** Reference sample graph matching the compute spec example. */
export const SAMPLE_GRAPH: GraphInput = {
	vertices: 5,
	source: 1,
	edges: [
		{ from: 1, to: 2, weight: 5 },
		{ from: 1, to: 3, weight: 2 },
		{ from: 2, to: 4, weight: 3 },
		{ from: 3, to: 4, weight: 6 },
		{ from: 2, to: 5, weight: 1 },
	],
};

/*
 * Saved-graphs DTO types.
 *
 * Backend reference: `backend/src/saved-graphs/` (GET/POST/PATCH/DELETE
 * `/graphs`). The `graph` payload uses the exact same `GraphInput` shape as
 * the compute endpoint, so a saved graph can be solved without conversion.
 */

/** One persisted graph returned by the saved-graphs API. */
export interface SavedGraph {
	id: string;
	name: string;
	graph: GraphInput;
	createdAt: string;
	updatedAt: string;
}

/** Body for POST /graphs. */
export interface CreateSavedGraphDto {
	name: string;
	graph: GraphInput;
}

/** Body for PATCH /graphs/:id (at least one field must be present). */
export interface UpdateSavedGraphDto {
	name?: string;
	graph?: GraphInput;
}

export function isValidGraph(input: GraphInput): boolean {
	if (input.vertices < 1) return false;
	if (input.source < 1 || input.source > input.vertices) return false;
	return input.edges.every((e) => e.from >= 1 && e.from <= input.vertices && e.to >= 1 && e.to <= input.vertices);
}

export function parseGraph(json: string): GraphInput {
	const parsed: unknown = JSON.parse(json);
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Graph must be a JSON object.');
	}
	const obj = parsed as Record<string, unknown>;
	if (
		typeof obj.vertices !== 'number' ||
		!Array.isArray(obj.edges) ||
		typeof obj.source !== 'number'
	) {
		throw new Error('Graph must contain "vertices", "edges" and "source".');
	}
	return { vertices: obj.vertices, edges: obj.edges as GraphEdge[], source: obj.source };
}