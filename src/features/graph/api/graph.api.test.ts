import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ComputeResponse } from '../types';

// `graph.api` only needs `http.post`; mocking keeps the test off the network.
vi.mock('@/shared/api/http', () => ({
	default: { post: vi.fn() },
}));

import http from '@/shared/api/http';
import { graphApi } from './graph.api';

const postMock = vi.mocked(http.post);

const GRAPH = {
	vertices: 4,
	source: 1,
	edges: [
		{ from: 1, to: 2, weight: 10 },
		{ from: 2, to: 4, weight: 10 },
	],
};

describe('graphApi.execute', () => {
	beforeEach(() => {
		postMock.mockReset();
	});

	it('sends include_steps and no sink for minty', async () => {
		postMock.mockResolvedValue({ status: 'ok', algorithm: 'minty', result: {}, steps: [] });

		await graphApi.execute({ algorithm: 'minty', graph: GRAPH, options: { includeSteps: true } });

		expect(postMock).toHaveBeenCalledWith('/graph/compute', {
			algorithm: 'minty',
			graph: GRAPH,
			include_steps: true,
		});
	});

	it('adds the sink for flow algorithms (defaulting to the last vertex)', async () => {
		postMock.mockResolvedValue({ status: 'ok', algorithm: 'ford_fulkerson', result: {}, steps: [] });

		await graphApi.execute({ algorithm: 'ford_fulkerson', graph: GRAPH });

		expect(postMock.mock.calls[0][1]).toMatchObject({ sink: 4, include_steps: true });
	});

	it('uses an explicit sink when provided', async () => {
		postMock.mockResolvedValue({ status: 'ok', algorithm: 'edmonds_karp', result: {}, steps: [] });

		await graphApi.execute({ algorithm: 'edmonds_karp', graph: GRAPH, sink: 2 });

		expect(postMock.mock.calls[0][1]).toMatchObject({ sink: 2 });
	});

	it('maps the backend envelope onto ComputeResponse as-is', async () => {
		const envelope: ComputeResponse = {
			status: 'ok',
			algorithm: 'ford_fulkerson',
			result: {
				algorithm: 'ford_fulkerson',
				mode: 'dfs',
				max_flow: 20,
				source: 1,
				sink: 4,
				flows: [{ index: 0, from: 1, to: 2, flow: 10, capacity: 10 }],
				min_cut: { value: 20, source_side: [1], sink_side: [2, 3, 4], edges: [] },
			},
			steps: [],
		};
		postMock.mockResolvedValue(envelope);

		const res = await graphApi.execute({ algorithm: 'ford_fulkerson', graph: GRAPH, sink: 4 });

		expect(res).toBe(envelope);
		expect(res.result).toHaveProperty('max_flow', 20);
	});
});
