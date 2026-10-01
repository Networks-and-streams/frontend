// src/features/graph/store/savedGraphsStore.ts
import { create } from 'zustand';
import { i18n } from '@/shared/i18n';
import { savedGraphsApi } from '../api/savedGraphs.api';
import type { SavedGraph } from '../types';

/**
 * Saved-graphs collection (persisted server state).
 *
 * This store is the frontend source of truth for the user's saved graphs. It is
 * fetched once per authenticated session (see App.tsx) and mutated only from
 * backend responses — no optimistic persistence, no duplicate local caches.
 */
interface SavedGraphsState {
	/** All saved graphs of the authenticated user, most recently updated first. */
	graphs: SavedGraph[];
	/** True while an initial fetch or manual retry is in flight. */
	isLoading: boolean;
	error: string | null;
	/** True once the initial fetch finished (success or failure) — guards against refetch storms. */
	fetched: boolean;

	fetchGraphs: () => Promise<void>;
	addGraph: (graph: SavedGraph) => void;
	updateGraph: (graph: SavedGraph) => void;
	removeGraph: (id: string) => void;
	getGraph: (id: string) => SavedGraph | undefined;
	/** Clears the collection on logout / auth change. */
	clear: () => void;
}

function byUpdatedAtDesc(a: SavedGraph, b: SavedGraph): number {
	return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function upsert(state: SavedGraphsState, graph: SavedGraph) {
	return { graphs: [...state.graphs.filter((g) => g.id !== graph.id), graph].sort(byUpdatedAtDesc) };
}

export const useSavedGraphsStore = create<SavedGraphsState>((set, get) => ({
	graphs: [],
	isLoading: false,
	error: null,
	fetched: false,

	fetchGraphs: async () => {
		set({ isLoading: true, error: null });
		try {
			const graphs = await savedGraphsApi.listGraphs();
			set({ graphs, isLoading: false, fetched: true });
		} catch (error) {
			set({
				isLoading: false,
				fetched: true,
				error: error instanceof Error ? error.message : i18n.t('errors.failedToLoadSavedGraphs'),
			});
		}
	},

	addGraph: (graph) => set((state) => upsert(state, graph)),

	updateGraph: (graph) => set((state) => upsert(state, graph)),

	removeGraph: (id) => set((state) => ({ graphs: state.graphs.filter((g) => g.id !== id) })),

	getGraph: (id) => get().graphs.find((g) => g.id === id),

	clear: () => set({ graphs: [], isLoading: false, error: null, fetched: false }),
}));