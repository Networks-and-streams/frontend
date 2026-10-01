import type { ElementDefinition } from 'cytoscape';
import type { ComputeResult, GraphInput } from '../types';

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

/**
 * Derives the element ids that participate in the computed shortest paths
 * (e.g. the Minty result: a route to each reachable vertex) so the
 * visualization can highlight them.
 */
export function collectResultHighlight(
	graph: GraphInput,
	result: ComputeResult | null | undefined,
): ResultHighlight {
	const paths = result?.paths;
	if (!paths) return { nodeIds: [], edgeIds: [] };

	// Index real edges by "from->to" so a path step maps back to edge id(s).
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

	const nodeIds = new Set<string>();
	const edgeIds = new Set<string>();

	for (const path of Object.values(paths)) {
		path.forEach((vertex) => nodeIds.add(graphNodeId(vertex)));
		for (let step = 0; step + 1 < path.length; step += 1) {
			const ids = edgesByPair.get(`${path[step]}->${path[step + 1]}`);
			ids?.forEach((id) => edgeIds.add(id));
		}
	}

	return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] };
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
