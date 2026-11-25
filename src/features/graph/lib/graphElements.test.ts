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

describe('buildTraceOverlay (detailed Ford–Fulkerson frames)', () => {
	const DETAILED_LABEL: FlowStep = {
		iteration: 3,
		stage: 1,
		stage_step: 2,
		kind: 'label',
		marks: [
			{ vertex: 1, mark: null },
			{ vertex: 2, mark: 10 },
		],
		labeled: [1, 2],
		unlabeled: [3, 4],
		computation: { from: 1, to: 2, mark_from: null, residual: 10, mark_to: 10, edge_index: 0, backward: false },
		reverse_path: [],
		augmenting_path: [],
		bottleneck: 0,
		flows: [{ index: 0, from: 1, to: 2, flow: 0 }],
		max_flow_so_far: 0,
	};

	it('exposes marks, the labeled/unlabeled partition and the current vertex', () => {
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, DETAILED_LABEL, 'both');

		expect(overlay.nodeMarks.get('v1')).toBeNull(); // ∞
		expect(overlay.nodeMarks.get('v2')).toBe(10);
		expect(overlay.labeledNodeIds).toEqual(['v1', 'v2']);
		expect(overlay.unlabeledNodeIds).toEqual(['v3', 'v4']);
		expect(overlay.currentNodeId).toBe('v2'); // the vertex receiving the mark
		expect(overlay.reversePathNodeIds).toEqual([]);
	});

	it('keeps flow-process decorations out of the `cut` view', () => {
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, DETAILED_LABEL, 'cut');

		expect(overlay.nodeMarks.size).toBe(0);
		expect(overlay.labeledNodeIds).toEqual([]);
		expect(overlay.unlabeledNodeIds).toEqual([]);
	});

	it('does not mute the unlabeled set on the final frame (it is the sink side)', () => {
		const finalFrame: FlowStep = {
			...DETAILED_LABEL,
			stage: 2,
			stage_step: 4,
			kind: 'final',
			computation: undefined,
			min_cut: FLOW_RESULT.min_cut,
		};
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, finalFrame, 'both');

		expect(overlay.unlabeledNodeIds).toEqual([]);
		expect(overlay.labeledNodeIds).toEqual(['v1', 'v2']);
		expect(overlay.currentNodeId).toBeNull();
	});

	it('maps the reverse chain onto its nodes and source→sink edges', () => {
		const reverseFrame: FlowStep = {
			...DETAILED_LABEL,
			stage_step: 5,
			kind: 'reverse',
			computation: undefined,
			reverse_path: [4, 2, 1],
		};
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, reverseFrame, 'both');

		// The chain runs sink → source; the edges are looked up source → sink.
		expect(overlay.reversePathNodeIds).toEqual(['v4', 'v2', 'v1']);
		expect(overlay.reversePathEdgeIds).toEqual(expect.arrayContaining(['e1-2-0', 'e2-4-3']));
		expect(overlay.currentNodeId).toBeNull(); // no fresh label on a reverse frame
	});

	it('leaves flat Edmonds–Karp frames without detailed decorations', () => {
		const flatFrame: FlowStep = {
			iteration: 1,
			augmenting_path: [1, 2, 4],
			bottleneck: 10,
			flows: [],
			max_flow_so_far: 10,
		};
		const overlay = buildTraceOverlay(GRAPH, FLOW_RESULT, flatFrame, 'both');

		expect(overlay.nodeMarks.size).toBe(0);
		expect(overlay.labeledNodeIds).toEqual([]);
		expect(overlay.reversePathNodeIds).toEqual([]);
		// The flat frame still highlights its augmenting path.
		expect(overlay.activePathNodeIds).toEqual(['v1', 'v2', 'v4']);
	});
});
