import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComputeResponse, FlowStep } from '../types';

vi.mock('../api/graph.api', () => ({
	graphApi: { execute: vi.fn() },
}));

import { graphApi } from '../api/graph.api';
import { PLAY_INTERVAL_MS, selectStageInfo, useComputeResultStore } from './computeResultStore';

const executeMock = vi.mocked(graphApi.execute);

const GRAPH = { vertices: 3, source: 1, edges: [{ from: 1, to: 3, weight: 1 }] };

const FLOW_RESPONSE: ComputeResponse = {
	status: 'ok',
	algorithm: 'ford_fulkerson',
	result: {
		algorithm: 'ford_fulkerson',
		mode: 'dfs',
		max_flow: 5,
		source: 1,
		sink: 3,
		flows: [],
		min_cut: { value: 5, source_side: [1], sink_side: [2, 3], edges: [] },
	},
	steps: [
		{
			iteration: 1,
			augmenting_path: [1, 3],
			bottleneck: 5,
			flows: [{ from: 1, to: 3, flow: 5 }],
			max_flow_so_far: 5,
		},
		{ iteration: 2, augmenting_path: [], bottleneck: 0, flows: [], max_flow_so_far: 5 },
	],
};

function resetStore(): void {
	useComputeResultStore.getState().pause();
	useComputeResultStore.setState({
		result: null,
		steps: [],
		algorithm: null,
		phase: 'idle',
		error: null,
		stepIndex: 0,
		viewMode: 'both',
		isPlaying: false,
	});
}

/** Detailed trace fixture: stage 1 = 2 steps, stage 2 = 2 steps. */
const DETAILED_STEPS: FlowStep[] = [
	{
		iteration: 1,
		stage: 1,
		stage_step: 1,
		kind: 'label',
		marks: [{ vertex: 1, mark: null }],
		labeled: [1],
		unlabeled: [2, 3],
		reverse_path: [],
		augmenting_path: [],
		bottleneck: 0,
		flows: [],
		max_flow_so_far: 0,
	},
	{
		iteration: 2,
		stage: 1,
		stage_step: 2,
		kind: 'augment',
		marks: [
			{ vertex: 1, mark: null },
			{ vertex: 3, mark: 5 },
		],
		labeled: [1, 3],
		unlabeled: [2],
		reverse_path: [3, 1],
		augmenting_path: [1, 3],
		bottleneck: 5,
		flows: [],
		max_flow_so_far: 5,
	},
	{
		iteration: 3,
		stage: 2,
		stage_step: 1,
		kind: 'label',
		marks: [{ vertex: 1, mark: null }],
		labeled: [1],
		unlabeled: [2, 3],
		reverse_path: [],
		augmenting_path: [],
		bottleneck: 0,
		flows: [],
		max_flow_so_far: 5,
	},
	{
		iteration: 4,
		stage: 2,
		stage_step: 2,
		kind: 'final',
		marks: [{ vertex: 1, mark: null }],
		labeled: [1],
		unlabeled: [2, 3],
		reverse_path: [],
		augmenting_path: [],
		bottleneck: 0,
		flows: [],
		max_flow_so_far: 5,
		min_cut: { value: 5, source_side: [1], sink_side: [2, 3], edges: [] },
	},
];

describe('computeResultStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetStore();
		executeMock.mockReset();
	});

	it('stores result + trace and lands on the final frame', async () => {
		executeMock.mockResolvedValue(FLOW_RESPONSE);

		await useComputeResultStore.getState().run(GRAPH, 'ford_fulkerson', 3);

		const state = useComputeResultStore.getState();
		expect(state.phase).toBe('done');
		expect(state.result).toHaveProperty('max_flow', 5);
		expect(state.steps).toHaveLength(2);
		expect(state.stepIndex).toBe(1);
		expect(state.isPlaying).toBe(false);
	});

	it('sends the sink for flow algorithms', async () => {
		executeMock.mockResolvedValue(FLOW_RESPONSE);

		await useComputeResultStore.getState().run(GRAPH, 'edmonds_karp', 3);

		expect(executeMock.mock.calls[0][0]).toMatchObject({ sink: 3, algorithm: 'edmonds_karp' });
	});

	it('records an error without keeping a stale result', async () => {
		executeMock.mockRejectedValue(new Error('boom'));

		await useComputeResultStore.getState().run(GRAPH, 'minty');

		const state = useComputeResultStore.getState();
		expect(state.phase).toBe('error');
		expect(state.error).toBe('boom');
		expect(state.result).toBeNull();
		expect(state.steps).toHaveLength(0);
	});

	it('clamps step navigation into 0..N-1', () => {
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 1 });

		const store = useComputeResultStore.getState();
		store.nextStep();
		expect(useComputeResultStore.getState().stepIndex).toBe(1); // already last

		store.setStep(99);
		expect(useComputeResultStore.getState().stepIndex).toBe(1);

		store.setStep(-5);
		expect(useComputeResultStore.getState().stepIndex).toBe(0);

		store.firstStep();
		expect(useComputeResultStore.getState().stepIndex).toBe(0);

		store.prevStep();
		expect(useComputeResultStore.getState().stepIndex).toBe(0);

		store.lastStep();
		expect(useComputeResultStore.getState().stepIndex).toBe(1);
	});

	it('advances one frame per tick and pauses on the last frame', () => {
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 0 });

		useComputeResultStore.getState().play();
		expect(useComputeResultStore.getState().isPlaying).toBe(true);
		expect(useComputeResultStore.getState().stepIndex).toBe(0);

		vi.advanceTimersByTime(PLAY_INTERVAL_MS);
		expect(useComputeResultStore.getState().stepIndex).toBe(1);

		// The playback auto-stops on the last frame.
		vi.advanceTimersByTime(PLAY_INTERVAL_MS);
		expect(useComputeResultStore.getState().isPlaying).toBe(false);
		expect(useComputeResultStore.getState().stepIndex).toBe(1);
	});

	it('restarts from the first frame when play is pressed on the last frame', () => {
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 1 });

		useComputeResultStore.getState().play();
		expect(useComputeResultStore.getState().stepIndex).toBe(0);
		expect(useComputeResultStore.getState().isPlaying).toBe(true);
	});

	it('pause keeps the current frame and stops the timer', () => {
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 0 });
		useComputeResultStore.getState().play();
		vi.advanceTimersByTime(PLAY_INTERVAL_MS);

		useComputeResultStore.getState().pause();
		expect(useComputeResultStore.getState().isPlaying).toBe(false);

		vi.advanceTimersByTime(PLAY_INTERVAL_MS * 3);
		expect(useComputeResultStore.getState().stepIndex).toBe(1); // no further ticks
	});

	it('setViewMode switches flow/cut/both and resetView rewinds', () => {
		useComputeResultStore.getState().setViewMode('cut');
		expect(useComputeResultStore.getState().viewMode).toBe('cut');

		useComputeResultStore.setState({ stepIndex: 1, isPlaying: true });
		useComputeResultStore.getState().resetView();

		expect(useComputeResultStore.getState().viewMode).toBe('both');
		expect(useComputeResultStore.getState().stepIndex).toBe(0);
		expect(useComputeResultStore.getState().isPlaying).toBe(false);
	});

	it('clear() restores the initial state and stops playback', () => {
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 1 });
		useComputeResultStore.getState().play();
		useComputeResultStore.getState().clear();

		const state = useComputeResultStore.getState();
		expect(state.result).toBeNull();
		expect(state.steps).toHaveLength(0);
		expect(state.phase).toBe('idle');
		expect(state.stepIndex).toBe(0);
		expect(state.isPlaying).toBe(false);

		vi.advanceTimersByTime(PLAY_INTERVAL_MS * 2);
		expect(useComputeResultStore.getState().stepIndex).toBe(0);
	});

	it('selectStageInfo reports the stage/step position of a detailed frame', () => {
		useComputeResultStore.setState({ steps: DETAILED_STEPS, stepIndex: 1 });
		expect(selectStageInfo(useComputeResultStore.getState())).toEqual({
			stage: 1,
			stages: 2,
			step: 2,
			stepsInStage: 2,
		});

		useComputeResultStore.setState({ stepIndex: 3 });
		expect(selectStageInfo(useComputeResultStore.getState())).toEqual({
			stage: 2,
			stages: 2,
			step: 2,
			stepsInStage: 2,
		});

		// Flat traces (Edmonds–Karp / Minty) have no stages at all.
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 0 });
		expect(selectStageInfo(useComputeResultStore.getState())).toBeNull();
	});

	it('prevStage/nextStage jump to the first frame of the neighbouring stage', () => {
		useComputeResultStore.setState({ steps: DETAILED_STEPS, stepIndex: 3 }); // stage 2, step 2

		const store = useComputeResultStore.getState();
		store.prevStage();
		expect(useComputeResultStore.getState().stepIndex).toBe(0); // stage 1 starts here

		store.prevStage(); // already the first stage — no-op
		expect(useComputeResultStore.getState().stepIndex).toBe(0);

		store.nextStage();
		expect(useComputeResultStore.getState().stepIndex).toBe(2); // stage 2 starts here

		store.nextStage(); // no stage 3 — no-op
		expect(useComputeResultStore.getState().stepIndex).toBe(2);

		// Stepping inside a stage never crosses its boundary.
		useComputeResultStore.getState().setStep(3);
		useComputeResultStore.getState().nextStep();
		expect(useComputeResultStore.getState().stepIndex).toBe(3); // last frame, clamped
	});

	it('stage navigation is a no-op on flat traces', () => {
		useComputeResultStore.setState({ steps: FLOW_RESPONSE.steps, stepIndex: 1 });

		useComputeResultStore.getState().nextStage();
		expect(useComputeResultStore.getState().stepIndex).toBe(1);
		useComputeResultStore.getState().prevStage();
		expect(useComputeResultStore.getState().stepIndex).toBe(1);
	});
});
