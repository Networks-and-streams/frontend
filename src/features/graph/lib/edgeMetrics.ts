import type { EdgeMetric, GraphEdge, GraphInput, MetricAggregate } from '../types';
import { MAX_METRICS } from '../types';

/**
 * Extra edge parameters: editing the parameter set, and summarising a
 * parameter along a route (sum / bottleneck min / max). Pure functions.
 */

/** Adds a parameter with the first free key (`m1`, `m2`, …). */
export function addMetric(graph: GraphInput, name: string, aggregate: MetricAggregate): GraphInput {
	const metrics = graph.metrics ?? [];
	if (metrics.length >= MAX_METRICS) return graph;
	const used = new Set(metrics.map((m) => m.key));
	let n = 1;
	while (used.has(`m${n}`)) n += 1;
	return { ...graph, metrics: [...metrics, { key: `m${n}`, name, aggregate }] };
}

export function updateMetric(graph: GraphInput, key: string, patch: Partial<Omit<EdgeMetric, 'key'>>): GraphInput {
	return { ...graph, metrics: (graph.metrics ?? []).map((m) => (m.key === key ? { ...m, ...patch } : m)) };
}

/** Removes a parameter and its value from every edge. */
export function removeMetric(graph: GraphInput, key: string): GraphInput {
	return {
		...graph,
		metrics: (graph.metrics ?? []).filter((m) => m.key !== key),
		edges: graph.edges.map((edge) => withValue(edge, key, null)),
	};
}

/** Sets (or, with null, clears) one parameter value of an edge. */
export function withValue(edge: GraphEdge, key: string, value: number | null): GraphEdge {
	const values = { ...edge.values };
	if (value === null) delete values[key];
	else values[key] = value;
	const base: GraphEdge = { from: edge.from, to: edge.to, weight: edge.weight };
	return Object.keys(values).length > 0 ? { ...base, values } : base;
}

export function setEdgeValue(graph: GraphInput, index: number, key: string, value: number | null): GraphInput {
	return { ...graph, edges: graph.edges.map((e, i) => (i === index ? withValue(e, key, value) : e)) };
}

/**
 * The edges a route (vertex sequence) runs over. Between parallel edges the
 * lightest one is taken: it is the one a shortest route uses.
 */
export function routeEdges(graph: GraphInput, route: number[]): GraphEdge[] {
	const edges: GraphEdge[] = [];
	for (let i = 0; i + 1 < route.length; i += 1) {
		let best: GraphEdge | undefined;
		for (const edge of graph.edges) {
			if (edge.from === route[i] && edge.to === route[i + 1] && (!best || edge.weight < best.weight)) best = edge;
		}
		if (best) edges.push(best);
	}
	return edges;
}

export interface RouteMetricSummary {
	metric: EdgeMetric;
	/** Null when the route has no edges. */
	value: number | null;
	/** Edges of the route without a value for this parameter (summary is partial). */
	missing: number;
}

/** Summarises every parameter along a route. */
export function summarizeRoute(graph: GraphInput, route: number[]): RouteMetricSummary[] {
	const edges = routeEdges(graph, route);
	return (graph.metrics ?? []).map((metric) => {
		const values = edges.map((e) => e.values?.[metric.key]).filter((v): v is number => v !== undefined);
		const missing = edges.length - values.length;
		if (values.length === 0) return { metric, value: null, missing };
		const value =
			metric.aggregate === 'sum'
				? values.reduce((a, b) => a + b, 0)
				: metric.aggregate === 'min'
					? Math.min(...values)
					: Math.max(...values);
		return { metric, value, missing };
	});
}

/** Compact number for labels (at most 3 decimals, no trailing zeros). */
export function formatMetricValue(value: number): string {
	return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
}
