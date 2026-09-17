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
	};
}

/** Response shape for the future compute endpoint. */
export interface ComputeResponse {
	status: 'ok' | 'error';
	result?: unknown;
	executionTrace?: unknown[];
	error?: {
		type: string;
		message: string;
	};
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