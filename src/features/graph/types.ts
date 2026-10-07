/**
 * Graph domain types.
 *
 * The compute service contract is described in `compute/README.md` (gRPC
 * `ComputeService.Execute(algorithm, graph, options)`). The graph input model
 * below mirrors the JSON contract from that spec so the frontend boundary is
 * ready to wire to the real endpoint once it exists.
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
} as const;
export type GraphAlgorithm = (typeof GRAPH_ALGORITHM)[keyof typeof GRAPH_ALGORITHM];

/** Request shape for the future compute endpoint. */
export interface ComputeRequest {
	algorithm: GraphAlgorithm;
	graph: GraphInput;
	options?: {
		includeSteps?: boolean;
		/** Minty: only find routes to this vertex (null/undefined = every vertex). */
		target?: number | null;
	};
}

/** Result payload returned by the compute endpoint (algorithm-specific). */
export interface ComputeResult {
	source?: number;
	/** Shortest distance to each vertex (key = vertex id); null when unreachable. */
	distances?: Record<string, number | null>;
	/**
	 * Every shortest route to each vertex (key = vertex id): several when routes
	 * tie, empty when the vertex is unreachable.
	 */
	paths?: Record<string, number[][]>;
	/** True when more tied shortest routes exist than the compute service returned. */
	truncated?: boolean;
}

/** One Minty execution step: the vertex finalized and the distance table after it. */
export interface MintyStep {
	current: number | null;
	visited: number[];
	/** Key = vertex id; null = not reached yet. */
	distances: Record<string, number | null>;
}

/** Daily run allowance returned by GET /graph/quota and with every compute response. */
export interface ComputeQuota {
	/** True with an active subscription: no daily limit. */
	unlimited: boolean;
	/** Free runs are locked until the email is verified. */
	requiresVerification: boolean;
	limit: number | null;
	used: number;
	remaining: number | null;
	resetsAt: string | null;
}

/** Response of POST /graph/compute (`backend/src/graph/graph.controller.ts`). */
export interface ComputeResponse {
	/** `ok` on success, otherwise the compute error kind (e.g. `InvalidGraph`). */
	status: string;
	result?: ComputeResult | null;
	/** Execution steps (Minty); validate with `isTraceFor` before use. */
	steps?: unknown;
	error?: string;
	quota: ComputeQuota;
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

/** Mirrors the backend's rules (`backend/src/saved-graphs/graph-data.validation.ts`). */
export function isValidGraph(input: GraphInput): boolean {
	const inRange = (v: number) => Number.isInteger(v) && v >= 1 && v <= input.vertices;
	if (!Number.isInteger(input.vertices) || input.vertices < 1) return false;
	if (!inRange(input.source)) return false;
	return input.edges.every(
		(e) => inRange(e.from) && inRange(e.to) && Number.isInteger(e.weight) && e.weight >= 0,
	);
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