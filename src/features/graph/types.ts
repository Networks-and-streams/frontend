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
	/** What the algorithm optimizes (Minty: length). */
	weight: number;
	/** Optional extra parameters, by {@link EdgeMetric.key}; a missing key = no data. */
	values?: Record<string, number>;
}

/** How a parameter combines along a route. */
export type MetricAggregate = 'sum' | 'min' | 'max';

/**
 * An extra edge parameter defined for the whole graph (throughput, time,
 * cost…). It does not change what the algorithm computes; it is summarised
 * for every route found (e.g. the bottleneck throughput of a path).
 */
export interface EdgeMetric {
	/** Stable id used in `GraphEdge.values` (renaming keeps the data). */
	key: string;
	name: string;
	aggregate: MetricAggregate;
}

export interface GraphInput {
	vertices: number;
	edges: GraphEdge[];
	source: number;
	/** Extra edge parameters; absent or empty = none. */
	metrics?: EdgeMetric[];
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
/** Limits mirrored from the backend (`graph-data.validation.ts`). */
export const MAX_METRICS = 8;
export const MAX_METRIC_NAME = 40;
export const METRIC_KEY_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const MAX_METRIC_VALUE = 1e12;
export const METRIC_AGGREGATES: readonly MetricAggregate[] = ['sum', 'min', 'max'];

function areValidMetrics(metrics: EdgeMetric[] | undefined): metrics is EdgeMetric[] | undefined {
	if (metrics === undefined) return true;
	if (!Array.isArray(metrics) || metrics.length > MAX_METRICS) return false;
	const keys = new Set(metrics.map((m) => m.key));
	return (
		keys.size === metrics.length &&
		metrics.every(
			(m) =>
				METRIC_KEY_PATTERN.test(m.key) &&
				typeof m.name === 'string' &&
				m.name.trim().length > 0 &&
				m.name.length <= MAX_METRIC_NAME &&
				METRIC_AGGREGATES.includes(m.aggregate),
		)
	);
}

/** Mirrors the backend's rules (`backend/src/saved-graphs/graph-data.validation.ts`). */
export function isValidGraph(input: GraphInput): boolean {
	const inRange = (v: number) => Number.isInteger(v) && v >= 1 && v <= input.vertices;
	if (!Number.isInteger(input.vertices) || input.vertices < 1) return false;
	if (!inRange(input.source)) return false;
	if (!areValidMetrics(input.metrics)) return false;
	const keys = new Set((input.metrics ?? []).map((m) => m.key));
	return input.edges.every(
		(e) =>
			inRange(e.from) &&
			inRange(e.to) &&
			Number.isInteger(e.weight) &&
			e.weight >= 0 &&
			Object.entries(e.values ?? {}).every(
				([key, value]) => keys.has(key) && Number.isFinite(value) && Math.abs(value) <= MAX_METRIC_VALUE,
			),
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
	return {
		vertices: obj.vertices,
		edges: obj.edges as GraphEdge[],
		source: obj.source,
		...(Array.isArray(obj.metrics) && { metrics: obj.metrics as EdgeMetric[] }),
	};
}