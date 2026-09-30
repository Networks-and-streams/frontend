// src/features/graph/api/graph.api.ts
import http from '@/shared/api/http';
import type { ComputeRequest, ComputeResponse } from '../types';

export const graphApi = {
	execute: async (data: ComputeRequest) =>
		http.post<ComputeResponse>('/graph/compute', {
			algorithm: data.algorithm,
			graph: {
				vertices: data.graph.vertices,
				edges: data.graph.edges,
				source: data.graph.source,
			},
			include_steps: data.options?.includeSteps ?? true,
		}),
};
