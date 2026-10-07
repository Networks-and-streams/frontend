import type { GraphInput, MintyStep } from '../types';

/**
 * Turns Minty's execution steps into what one animation frame shows.
 *
 * Each step finalizes one vertex (`current`) and carries the full distance
 * table after relaxing its outgoing edges. What changed is derived by comparing
 * with the previous step (before step 0 only the source is known, at 0).
 */

export interface DistanceChange {
	vertex: number;
	from: number | null;
	to: number;
}

export interface StepFrame {
	index: number;
	current: number | null;
	/** Vertices whose distance is final. */
	visited: Set<number>;
	/** Reached but not yet final (provisional distance). */
	frontier: Set<number>;
	distances: Map<number, number | null>;
	/** Distances improved in this step. */
	improved: DistanceChange[];
	/** Indices of the edges out of `current` that produced an improvement. */
	relaxedEdges: Set<number>;
}

function readDistances(step: MintyStep, vertices: number): Map<number, number | null> {
	const distances = new Map<number, number | null>();
	for (let v = 1; v <= vertices; v += 1) distances.set(v, step.distances[String(v)] ?? null);
	return distances;
}

function initialDistances(graph: GraphInput): Map<number, number | null> {
	const distances = new Map<number, number | null>();
	for (let v = 1; v <= graph.vertices; v += 1) distances.set(v, v === graph.source ? 0 : null);
	return distances;
}

export function stepFrame(graph: GraphInput, steps: MintyStep[], index: number): StepFrame {
	const step = steps[index];
	const distances = readDistances(step, graph.vertices);
	const previous = index > 0 ? readDistances(steps[index - 1], graph.vertices) : initialDistances(graph);
	const visited = new Set(step.visited);

	const improved: DistanceChange[] = [];
	const frontier = new Set<number>();
	distances.forEach((distance, vertex) => {
		if (distance === null) return;
		const before = previous.get(vertex) ?? null;
		if (before === null || distance < before) improved.push({ vertex, from: before, to: distance });
		if (!visited.has(vertex)) frontier.add(vertex);
	});

	const relaxedEdges = new Set<number>();
	const current = step.current;
	const currentDistance = current === null ? null : distances.get(current);
	if (current !== null && currentDistance != null) {
		const improvedVertices = new Set(improved.map((change) => change.vertex));
		graph.edges.forEach((edge, i) => {
			if (
				edge.from === current &&
				improvedVertices.has(edge.to) &&
				currentDistance + edge.weight === distances.get(edge.to)
			) {
				relaxedEdges.add(i);
			}
		});
	}

	return { index, current, visited, frontier, distances, improved, relaxedEdges };
}

/** Steps are usable only if they match this graph (e.g. not stale after edits). */
export function isTraceFor(graph: GraphInput, steps: unknown): steps is MintyStep[] {
	return (
		Array.isArray(steps) &&
		steps.length > 0 &&
		steps.every(
			(s) =>
				typeof s === 'object' &&
				s !== null &&
				Array.isArray((s as MintyStep).visited) &&
				typeof (s as MintyStep).distances === 'object' &&
				((s as MintyStep).current === null ||
					((s as MintyStep).current! >= 1 && (s as MintyStep).current! <= graph.vertices)),
		)
	);
}
