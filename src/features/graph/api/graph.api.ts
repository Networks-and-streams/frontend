// src/features/graph/api/graph.api.ts
import http from '@/shared/api/http';
import type { ComputeQuota, ComputeRequest, ComputeResponse } from '../types';

export const graphApi = {
	/** GET /graph/quota — today's remaining runs (unlimited with Premium). */
	getQuota: async () => http.get<ComputeQuota>('/graph/quota'),

	execute: async (data: ComputeRequest) =>
		http.post<ComputeResponse>('/graph/compute', {
			algorithm: data.algorithm,
			graph: {
				vertices: data.graph.vertices,
				// Compute optimizes the weight; extra edge parameters stay in the browser.
				edges: data.graph.edges.map(({ from, to, weight }) => ({ from, to, weight })),
				source: data.graph.source,
			},
			include_steps: data.options?.includeSteps ?? true,
			...(data.options?.target != null && { target: data.options.target }),
		}),
};
