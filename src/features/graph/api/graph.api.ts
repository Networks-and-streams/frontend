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
				edges: data.graph.edges,
				source: data.graph.source,
			},
			include_steps: data.options?.includeSteps ?? true,
			...(data.options?.target != null && { target: data.options.target }),
		}),
};
