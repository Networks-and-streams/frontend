// src/features/graph/store/computeResultStore.ts
import { create } from 'zustand';
import { getApiErrorMessage } from '@/shared/api/http';
import { graphApi } from '../api/graph.api';
import {
	isFlowAlgorithm,
	isFlowStep,
	type AlgorithmStep,
	type ComputeRequest,
	type FlowStep,
	type GraphAlgorithm,
	type GraphInput,
	type MintyResult,
	type SolverResult,
} from '../types';

/** Lifecycle of a solver run. */
export type ComputePhase = 'idle' | 'running' | 'done' | 'error';

/** Which part of a max-flow solution is rendered (§3.4). */
export type ViewMode = 'flow' | 'cut' | 'both';

/** Cadence of the automatic trace playback (~600–800 ms per step). */
export const PLAY_INTERVAL_MS = 700;

/**
 * Playback timer lives outside the reactive state on purpose: ticking must not
 * re-render the store subscribers, and only `isPlaying` should.
 */
let playTimer: ReturnType<typeof setInterval> | null = null;

function stopPlayTimer(): void {
	if (playTimer !== null) {
		clearInterval(playTimer);
		playTimer = null;
	}
}

export interface ComputeResultState {
	/** Last successful solver result (null before the first run). */
	result: SolverResult | null;
	/** Execution trace of the last run (empty when steps were not requested). */
	steps: AlgorithmStep[];
	/** Algorithm that produced `result` — decides which panel renders. */
	algorithm: GraphAlgorithm | null;
	phase: ComputePhase;
	error: string | null;
	/** Index of the trace frame currently displayed (0..steps.length - 1). */
	stepIndex: number;
	viewMode: ViewMode;
	isPlaying: boolean;

	/** Executes the algorithm and stores result + trace. */
	run: (graph: GraphInput, algorithm: GraphAlgorithm, sink?: number) => Promise<void>;
	/** Drops the result/trace (e.g. when the edited graph changes). */
	clear: () => void;

	/** Jumps to an explicit frame (clamped), stopping playback. */
	setStep: (index: number) => void;
	/** One frame forward; pauses automatically on the last frame. */
	nextStep: () => void;
	/** One frame backward (stops playback). */
	prevStep: () => void;
	/** First frame (stops playback). */
	firstStep: () => void;
	/** Last frame (stops playback). */
	lastStep: () => void;

	/** Starts the automatic playback; restarts from the first frame at the end. */
	play: () => void;
	/** Stops the automatic playback, keeping the current frame. */
	pause: () => void;
	/** Rewinds the trace to the beginning and restores the default view. */
	resetView: () => void;
	setViewMode: (mode: ViewMode) => void;
}

const INITIAL = {
	result: null,
	steps: [] as AlgorithmStep[],
	algorithm: null,
	phase: 'idle' as ComputePhase,
	error: null,
	stepIndex: 0,
	viewMode: 'both' as ViewMode,
	isPlaying: false,
};

function clampStep(index: number, steps: AlgorithmStep[]): number {
	if (steps.length === 0) return 0;
	return Math.min(Math.max(index, 0), steps.length - 1);
}

export const useComputeResultStore = create<ComputeResultState>((set, get) => ({
	...INITIAL,

	run: async (graph, algorithm, sink) => {
		// A new run always starts from a clean slate.
		stopPlayTimer();
		set({ phase: 'running', error: null, isPlaying: false });

		const request: ComputeRequest = { algorithm, graph, options: { includeSteps: true } };
		if (isFlowAlgorithm(algorithm)) request.sink = sink ?? graph.vertices;

		try {
			const response = await graphApi.execute(request);
			set({
				result: response.result,
				steps: response.steps ?? [],
				algorithm: response.algorithm,
				phase: 'done',
				error: null,
				// Land on the final frame: the user sees the finished solution
				// immediately and can press ⏮ / ▶ to replay the trace.
				stepIndex: clampStep((response.steps ?? []).length - 1, response.steps ?? []),
				isPlaying: false,
			});
		} catch (error) {
			stopPlayTimer();
			set({
				result: null,
				steps: [],
				algorithm: null,
				phase: 'error',
				error: getApiErrorMessage(error),
				stepIndex: 0,
				isPlaying: false,
			});
		}
	},

	clear: () => {
		stopPlayTimer();
		set({ ...INITIAL });
	},

	setStep: (index) => {
		stopPlayTimer();
		set((state) => ({ stepIndex: clampStep(index, state.steps), isPlaying: false }));
	},

	nextStep: () => {
		const { stepIndex, steps } = get();
		if (stepIndex >= steps.length - 1) {
			get().pause();
			return;
		}
		set({ stepIndex: stepIndex + 1 });
	},

	prevStep: () => {
		stopPlayTimer();
		set((state) => ({ stepIndex: clampStep(state.stepIndex - 1, state.steps), isPlaying: false }));
	},

	firstStep: () => {
		stopPlayTimer();
		set({ stepIndex: 0, isPlaying: false });
	},

	lastStep: () => {
		stopPlayTimer();
		set((state) => ({ stepIndex: clampStep(state.steps.length - 1, state.steps), isPlaying: false }));
	},

	play: () => {
		const { steps, stepIndex, isPlaying } = get();
		if (steps.length === 0 || isPlaying) return;

		// Pressing play on the last frame replays the whole trace.
		const from = stepIndex >= steps.length - 1 ? 0 : stepIndex;
		set({ stepIndex: from, isPlaying: true });

		playTimer = setInterval(() => {
			const state = get();
			if (!state.isPlaying) {
				stopPlayTimer();
				return;
			}
			if (state.stepIndex >= state.steps.length - 1) {
				state.pause();
				return;
			}
			set({ stepIndex: state.stepIndex + 1 });
		}, PLAY_INTERVAL_MS);
	},

	pause: () => {
		stopPlayTimer();
		set({ isPlaying: false });
	},

	resetView: () => {
		stopPlayTimer();
		set({ stepIndex: 0, viewMode: 'both', isPlaying: false });
	},

	setViewMode: (mode) => set({ viewMode: mode }),
}));

/** Convenience selectors used by the panels (plain functions, no hooks). */
export function selectFlowStep(state: ComputeResultState): FlowStep | null {
	const step = state.steps[state.stepIndex];
	return isFlowStep(step) ? step : null;
}

export function selectMintyResult(state: ComputeResultState): MintyResult | null {
	const { result, algorithm } = state;
	if (algorithm !== 'minty' || !result) return null;
	return result as MintyResult;
}
