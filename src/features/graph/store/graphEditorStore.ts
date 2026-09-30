// src/features/graph/store/graphEditorStore.ts
import { create } from 'zustand';
import { SAMPLE_GRAPH, type GraphInput } from '../types';

/**
 * Currently edited graph (editor state).
 *
 * Kept separate from the saved-graphs collection: the editor may hold a new,
 * unsaved graph, a loaded saved graph, or a saved graph with local
 * modifications. Local changes never touch the persisted graph — persistence
 * happens exclusively through the explicit Save actions.
 */
interface GraphEditorState {
	/** Saved graph id when the editor mirrors a persisted graph, otherwise null (new/unsaved). */
	graphId: string | null;
	name: string;
	graph: GraphInput;
	/** True once the editor content diverges from the last saved state. */
	isDirty: boolean;

	/** Resets the editor to a blank new graph. */
	startNew: (name?: string) => void;
	/** Loads a saved graph into the editor. */
	loadSaved: (id: string, name: string, graph: GraphInput) => void;
	/** Applies a local graph edit (marks the editor dirty). */
	setGraph: (graph: GraphInput) => void;
	/** Applies a local rename (marks the editor dirty). */
	setName: (name: string) => void;
	/** Detaches the editor from its saved graph (e.g. the saved graph was deleted). */
	markUnsaved: () => void;
	/** Synchronizes the editor with the canonical backend response after a successful save. */
	markSaved: (id: string, name: string, graph: GraphInput) => void;
}

export const useGraphEditorStore = create<GraphEditorState>((set) => ({
	graphId: null,
	name: '',
	graph: SAMPLE_GRAPH,
	isDirty: false,

	startNew: (name = '') => set({ graphId: null, name, graph: SAMPLE_GRAPH, isDirty: false }),

	loadSaved: (id, name, graph) => set({ graphId: id, name, graph, isDirty: false }),

	setGraph: (graph) => set({ graph, isDirty: true }),

	setName: (name) => set({ name, isDirty: true }),

	markUnsaved: () => set({ graphId: null, isDirty: true }),

	markSaved: (id, name, graph) => set({ graphId: id, name, graph, isDirty: false }),
}));