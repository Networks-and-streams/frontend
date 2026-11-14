// src/features/graph/api/graph.api.ts
import http from '@/shared/api/http';
import { isFlowAlgorithm, type ComputeRequest, type ComputeResponse } from '../types';

export const graphApi = {
	/**
	 * Runs an algorithm on the compute service.
	 *
	 * The backend contract is `{ status, algorithm, result, steps }` with the
	 * JSON payloads already parsed (expansion plan §2.2). Flow algorithms
	 * additionally require the 1-based `sink` vertex.
	 */
	execute: async (data: ComputeRequest) => {
		const body: Record<string, unknown> = {
			algorithm: data.algorithm,
			graph: {
				vertices: data.graph.vertices,
				edges: data.graph.edges,
				source: data.graph.source,
			},
			include_steps: data.options?.includeSteps ?? true,
		};

		if (isFlowAlgorithm(data.algorithm)) {
			// The editor always provides a sink; fall back to the last vertex
			// so a missing value can never produce a backend 400.
			body.sink = data.sink ?? data.graph.vertices;
		}

		return http.post<ComputeResponse>('/graph/compute', body);
	},
};
