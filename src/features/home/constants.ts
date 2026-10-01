import { SAMPLE_GRAPH, type ComputeResult, type GraphInput } from '@/features/graph/types';

/**
 * Static content/keys for the Home / Welcome dashboard.
 *
 * Only i18n key lists and read-only preview fixtures live here; the actual copy
 * is in the shared translation resources (`shared/i18n/resources`).
 */

/** "How it works" workflow steps, in display order. */
export const HOW_IT_WORKS_KEYS = ['create', 'configure', 'run', 'view'] as const;

/** Maximum number of saved graphs shown in the "Recent graphs" section. */
export const RECENT_GRAPHS_LIMIT = 4;

/** Representative graph used by the editor and solver previews (read-only). */
export const PREVIEW_GRAPH: GraphInput = SAMPLE_GRAPH;

/**
 * Sample Minty shortest-path result used to highlight the solver preview.
 * Distances/paths mirror {@link PREVIEW_GRAPH} so the preview looks realistic
 * without invoking the compute service.
 */
export const PREVIEW_RESULT: ComputeResult = {
	source: 1,
	distances: { '1': 0, '2': 5, '3': 2, '4': 8, '5': 6 },
	paths: {
		'1': [1],
		'2': [1, 2],
		'3': [1, 3],
		'4': [1, 2, 4],
		'5': [1, 2, 5],
	},
};
