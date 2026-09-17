import type { ComputeRequest, ComputeResponse } from '../types';

/**
 * Compute service boundary.
 *
 * The compute service is NOT implemented in this repository yet:
 * `compute/README.md` specifies the intended gRPC contract
 * (`ComputeService.Execute` with `algorithm`, `graph`, `options`) and states
 * the `.proto` file still needs to be agreed upon. The backend exposes no
 * HTTP endpoint for graph solving today.
 *
 * This module deliberately throws so the boundary is explicit: the UI must not
 * pretend results exist. When the real endpoint lands, implement `execute`
 * against the actual DTO here and remove the placeholder.
 */
export const graphApi = {
	execute: async (_request: ComputeRequest): Promise<ComputeResponse> => {
		throw new Error(
			'The graph compute service is not available yet. See compute/README.md for the planned contract.',
		);
	},
};