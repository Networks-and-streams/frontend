import { describe, expect, it } from 'vitest';
import type { FlowStep, FordFulkersonResult, GraphInput, MintyResult, MintyStep } from '../types';
import { buildTraceOverlay, collectResultHighlight, toCytoscapeElements } from './graphElements';

/** 4-vertex graph: max_flow = min_cut = 20, source_side = [1]. */
const GRAPH: GraphInput = {
	vertices: 4,
	source: 1,
	edges: [
		{ from: 1, to: 2, weight: 10 },
		{ from: 1, to: 3, weight: 10 },
		{ from: 2, to: 3, weight: 6 },
		{ from: 2, to: 4, weight: 10 },
		{ from: 3, to: 4, weight: 10 },
	],
};

const FLOW_RESULT: FordFulkersonResult = {
	algorithm: 'ford_fulkerson',
	mode: 'dfs',
	max_flow: 20,
	source: 1,
	sink: 4,
	flows: [
		{ index: 0, from: 1, to: 2, flow: 10, capacity: 10 },
		{ index: 1, from: 1, to: 3, flow: 10, capacity: 10 },
		{ index: 2, from: 2, to: 3, flow: 0, capacity: 6 },
		{ index: 3, from: 2, to: 4, flow: 10, capacity: 10 },
		{ index: 4, from: 3, to: 4, flow: 10, capacity: 10 },
	],
	min_cut: {
		value: 20,
		source_side: [1],
		sink_side: [2, 3, 4],
		edges: [
			{ index: 0, from: 1, to: 2, capacity: 10 },
			{ index: 1, from: 1, to: 3, capacity: 10 },
		],
	},
};

const FINAL_STEP: FlowStep = {
	iteration: 4,
	augmenting_path: [],
	bottleneck: 0,
	flows: FLOW_RESULT.flows.map((e) => ({ index: e.index, from: e.from, to: e.to, flow: e.flow })),
	max_flow_so_far: 20,
	min_cut: FLOW_RESULT.min_cut,
};

describe('toCytoscapeElements', () => {
	it('creates 1-based node ids and edge ids with the edge index', () => {
		const elements = toCytoscapeElements(GRAPH);
		const ids = elements.map((el) => el.data.id);

		expect(ids).toContain('v1');
		expect(ids).toContain('v4');
		expect(ids).toContain('e1-2-0');
		expect(ids).toContain('e3-4-4');
		expect(elements).toHaveLength(GRAPH.vertices + GRAPH.edges.length);
	});

	it('marks the source node with the `source` class', () => {
		const elements = toCytoscapeElements(GRAPH);
		const source = elements.find((el) => el.data.id === 'v1');

		expect(source?.classes).toBe('source');
		expect(elements.find((el) => el.data.id === 'v2')?.classes).toBeUndefined();
	});
});

describe('collectResultHighlight (minty paths: number[][])', () => {
	const MINTY_RESULT: MintyResult = {
		source: 1,
		distances: { 1: 0, 2: 10, 3: 10, 4: 20 },
		paths: { 1: [[1]], 2: [[1, 2]], 3: [[1, 3]], 4: [[1, 2, 4], [1, 3, 4]] },
		truncated: false,
	};

	it('collects nodes and edges of every tied route', () => {
		const { nodeIds, edgeIds } = collectResultHighlight(GRAPH, MINTY_RESULT);

		expect(nodeIds).toEqual(expect.arrayContaining(['v1', 'v2', 'v3', 'v4']));
		expect(edgeIds).toEqual(expect.arrayContaining(['e1-2-0', 'e2-4-3', 'e3-4-4']));
	});

	it('returns empty sets for a null result', () => {
		expect(collectResultHighlight(GRAPH, null)).toEqual({ nodeIds: [], edgeIds: [] });
	});
});

describe('buildTraceOverlay', () => {
	it('labels edges with flow/capacity and flags saturated ones', () => {
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, FINAL_STEP, 'both');

		expect(overlay.edgeLabels.get('e1-2-0')).toBe('10/10');
		expect(overlay.edgeLabels.get('e2-3-2')).toBe('0/6');
		// Every edge of the solution is saturated except 2→3.
		expect(overlay.saturatedEdgeIds).toEqual(
			expect.arrayContaining(['e1-2-0', 'e1-3-1', 'e2-4-3', 'e3-4-4']),
		);
		expect(overlay.saturatedEdgeIds).not.toContain('e2-3-2');
	});

	it('marks the cut edges and both sides of the cut', () => {
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, FINAL_STEP, 'both');

		expect(overlay.cutEdgeIds).toEqual(expect.arrayContaining(['e1-2-0', 'e1-3-1']));
		expect(overlay.sourceSideNodeIds).toEqual(['v1']);
		expect(overlay.sinkSideNodeIds).toEqual(['v2', 'v3', 'v4']);
	});

	it('drops cut decorations in `flow` view and flow decorations in `cut` view', () => {
		const flowOnly = buildTraceOverlay(GRAPH, FLOW_RESULT, FINAL_STEP, 'flow');
		expect(flowOnly.cutEdgeIds).toHaveLength(0);
		expect(flowOnly.sourceSideNodeIds).toHaveLength(0);
		expect(flowOnly.edgeLabels.size).toBeGreaterThan(0);

		const cutOnly = buildTraceOverlay(GRAPH, FLOW_RESULT, FINAL_STEP, 'cut');
		expect(cutOnly.cutEdgeIds).toHaveLength(2);
		expect(cutOnly.edgeLabels.size).toBe(0);
		expect(cutOnly.saturatedEdgeIds).toHaveLength(0);
	});

	it('highlights the augmenting path of an intermediate frame', () => {
		const frame: FlowStep = {
			iteration: 1,
			augmenting_path: [1, 2, 4],
			bottleneck: 10,
			flows: [
				{ index: 0, from: 1, to: 2, flow: 10 },
				{ index: 3, from: 2, to: 4, flow: 10 },
			],
			max_flow_so_far: 10,
		};

		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, frame, 'both');

		expect(overlay.activePathNodeIds).toEqual(['v1', 'v2', 'v4']);
		expect(overlay.activePathEdgeIds).toEqual(expect.arrayContaining(['e1-2-0', 'e2-4-3']));
		// The flows come from THIS frame, not the final solution.
		expect(overlay.edgeLabels.get('e1-3-1')).toBeUndefined();
	});

	it('falls back to the final flow state without a trace frame', () => {
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, null, 'both');

		expect(overlay.edgeLabels.get('e1-2-0')).toBe('10/10');
		expect(overlay.cutEdgeIds).toHaveLength(2);
		expect(overlay.activePathEdgeIds).toHaveLength(0);
	});

	it('maps a minty frame onto visited/current vertices only', () => {
		const mintyStep: MintyStep = { current: 3, visited: [1, 2, 3], distances: {} };
		const overlay = buildTraceOverlay(GRAPH, null, mintyStep, 'both');

		expect(overlay.visitedNodeIds).toEqual(['v1', 'v2', 'v3']);
		expect(overlay.currentNodeId).toBe('v3');
		expect(overlay.edgeLabels.size).toBe(0);
	});
});
