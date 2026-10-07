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
			data: { id: graphNodeId(vertex), label: String(vertex), vertex },
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
				index,
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
 * Indices of the graph edges that make up the computed shortest paths (e.g. the
 * Minty result: a route to each reachable vertex). When parallel edges join the
 * same pair, the lightest one is the edge the route actually uses.
 */
export function resultEdgeIndices(graph: GraphInput, result: ComputeResult | null | undefined): Set<number> {
	const indices = new Set<number>();
	const paths = result?.paths;
	if (!paths) return indices;

	const lightestByPair = new Map<string, number>();
	graph.edges.forEach((edge, index) => {
		if (!isVertexInRange(edge.from, graph.vertices) || !isVertexInRange(edge.to, graph.vertices)) {
			return;
		}
		const key = `${edge.from}->${edge.to}`;
		const current = lightestByPair.get(key);
		if (current === undefined || edge.weight < graph.edges[current].weight) lightestByPair.set(key, index);
	});

	for (const path of Object.values(paths).flat()) {
		for (let step = 0; step + 1 < path.length; step += 1) {
			const index = lightestByPair.get(`${path[step]}->${path[step + 1]}`);
			if (index !== undefined) indices.add(index);
		}
	}
	return indices;
}

/** Element ids to highlight for a computed result. */
export function collectResultHighlight(
	graph: GraphInput,
	result: ComputeResult | null | undefined,
): ResultHighlight {
	const nodeIds = new Set<string>();
	for (const path of Object.values(result?.paths ?? {}).flat()) {
		path.forEach((vertex) => nodeIds.add(graphNodeId(vertex)));
	}
	const edgeIds = [...resultEdgeIndices(graph, result)].map((index) => {
		const edge = graph.edges[index];
		return graphEdgeId(edge.from, edge.to, index);
	});
	return { nodeIds: [...nodeIds], edgeIds };
}

/**
 * The result as a standalone graph: same vertices and source, keeping only the
 * edges on the computed paths. It can be edited, saved and solved like any graph.
 */
export function resultGraph(graph: GraphInput, result: ComputeResult | null | undefined): GraphInput {
	const indices = resultEdgeIndices(graph, result);
	return { ...graph, edges: graph.edges.filter((_, index) => indices.has(index)) };
}

/**
 * Narrows a result to the routes to one `target` vertex (null keeps all), so the
 * highlight, the result list and the result graph all show the same routes.
 */
export function resultForTarget(result: ComputeResult, target: number | null): ComputeResult {
	if (target === null) return result;
	const key = String(target);
	return {
		...result,
		paths: { [key]: result.paths?.[key] ?? [] },
		distances: { [key]: result.distances?.[key] ?? null },
	};
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
