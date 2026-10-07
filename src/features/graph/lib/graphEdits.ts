import type { GraphInput } from '../types';

/**
 * Pure, immutable edits on the graph domain model used by the visual editor.
 *
 * Vertices are 1-based and contiguous (`1..vertices`), so removing a vertex
 * renumbers every higher vertex down by one; edges and the source follow.
 */

/** Appends a new vertex; it gets the number `graph.vertices + 1`. */
export function addVertex(graph: GraphInput): GraphInput {
	return { ...graph, vertices: graph.vertices + 1 };
}

/** Maps an old vertex number to its number after removing `removed`. */
export function renumberAfterRemoval(vertex: number, removed: number): number {
	return vertex > removed ? vertex - 1 : vertex;
}

/**
 * Removes a vertex and its incident edges. The last remaining vertex cannot be
 * removed (a graph has at least one). Removing the source makes vertex 1 the source.
 */
export function removeVertex(graph: GraphInput, vertex: number): GraphInput {
	if (graph.vertices <= 1) return graph;
	return {
		vertices: graph.vertices - 1,
		source: graph.source === vertex ? 1 : renumberAfterRemoval(graph.source, vertex),
		edges: graph.edges
			.filter((e) => e.from !== vertex && e.to !== vertex)
			.map((e) => ({ ...e, from: renumberAfterRemoval(e.from, vertex), to: renumberAfterRemoval(e.to, vertex) })),
	};
}

export function setSource(graph: GraphInput, vertex: number): GraphInput {
	return { ...graph, source: vertex };
}

/** Appends a directed edge; it gets the index `graph.edges.length`. */
export function addEdge(graph: GraphInput, from: number, to: number, weight = 1): GraphInput {
	return { ...graph, edges: [...graph.edges, { from, to, weight }] };
}

export function removeEdge(graph: GraphInput, index: number): GraphInput {
	return { ...graph, edges: graph.edges.filter((_, i) => i !== index) };
}

export function setEdgeWeight(graph: GraphInput, index: number, weight: number): GraphInput {
	return { ...graph, edges: graph.edges.map((e, i) => (i === index ? { ...e, weight } : e)) };
}
