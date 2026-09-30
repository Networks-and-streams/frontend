// src/features/graph/api/savedGraphs.api.ts
import http from '@/shared/api/http';
import type { CreateSavedGraphDto, SavedGraph, UpdateSavedGraphDto } from '../types';

const GRAPHS_BASE = '/graphs';

/**
 * Typed client for the saved-graphs API (backend: `backend/src/saved-graphs/`).
 *
 * The list endpoint (`GET /graphs`) returns the complete graph definition for
 * every saved graph, so the saved-graph collection in Zustand is the single
 * source of truth and opening a graph never requires a follow-up request.
 */
export const savedGraphsApi = {
	/** GET /graphs — all saved graphs of the authenticated user. */
	listGraphs: async () => http.get<SavedGraph[]>(GRAPHS_BASE),

	/** GET /graphs/:id — one saved graph (fallback for stale references). */
	getGraph: async (id: string) => http.get<SavedGraph>(`${GRAPHS_BASE}/${id}`),

	/** POST /graphs — persists a new saved graph. */
	createGraph: async (dto: CreateSavedGraphDto) => http.post<SavedGraph>(GRAPHS_BASE, dto),

	/** PATCH /graphs/:id — updates the name and/or graph data of a saved graph. */
	updateGraph: async (id: string, dto: UpdateSavedGraphDto) => http.patch<SavedGraph>(`${GRAPHS_BASE}/${id}`, dto),

	/** DELETE /graphs/:id — deletes a saved graph. */
	deleteGraph: async (id: string) => http.del<void>(`${GRAPHS_BASE}/${id}`),
};