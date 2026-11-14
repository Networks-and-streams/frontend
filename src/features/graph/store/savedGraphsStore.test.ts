import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedGraph } from '../types';

vi.mock('../api/savedGraphs.api', () => ({
	savedGraphsApi: { listGraphs: vi.fn() },
}));

import { savedGraphsApi } from '../api/savedGraphs.api';
import { useSavedGraphsStore } from './savedGraphsStore';

const listMock = vi.mocked(savedGraphsApi.listGraphs);

function graph(id: string, updatedAt: string): SavedGraph {
	return {
		id,
		name: `graph-${id}`,
		graph: { vertices: 2, source: 1, edges: [] },
		createdAt: updatedAt,
		updatedAt,
	};
}

describe('savedGraphsStore', () => {
	beforeEach(() => {
		listMock.mockReset();
		useSavedGraphsStore.setState({
			graphs: [],
			isLoading: false,
			error: null,
			fetched: false,
		});
	});

	it('fetchGraphs stores the backend list and marks it fetched', async () => {
		listMock.mockResolvedValue([graph('a', '2026-11-13T10:00:00.000Z')]);

		await useSavedGraphsStore.getState().fetchGraphs();

		const state = useSavedGraphsStore.getState();
		expect(state.graphs).toHaveLength(1);
		expect(state.fetched).toBe(true);
		expect(state.isLoading).toBe(false);
		expect(state.error).toBeNull();
	});

	it('fetchGraphs records an error without marking data as loaded', async () => {
		listMock.mockRejectedValue(new Error('offline'));

		await useSavedGraphsStore.getState().fetchGraphs();

		const state = useSavedGraphsStore.getState();
		expect(state.error).toBe('offline');
		expect(state.fetched).toBe(true);
		expect(state.graphs).toHaveLength(0);
	});

	it('addGraph upserts by id and keeps the most recently updated first', () => {
		const store = useSavedGraphsStore.getState();
		store.addGraph(graph('a', '2026-11-01T00:00:00.000Z'));
		store.addGraph(graph('b', '2026-11-02T00:00:00.000Z'));
		store.updateGraph({ ...graph('a', '2026-11-03T00:00:00.000Z'), name: 'renamed' });

		const state = useSavedGraphsStore.getState();
		expect(state.graphs).toHaveLength(2);
		expect(state.graphs[0].id).toBe('a');
		expect(state.graphs[0].name).toBe('renamed');
		expect(useSavedGraphsStore.getState().getGraph('b')?.id).toBe('b');
	});

	it('removeGraph and clear drop the collection', () => {
		const store = useSavedGraphsStore.getState();
		store.addGraph(graph('a', '2026-11-01T00:00:00.000Z'));
		store.addGraph(graph('b', '2026-11-02T00:00:00.000Z'));

		useSavedGraphsStore.getState().removeGraph('a');
		expect(useSavedGraphsStore.getState().graphs.map((g) => g.id)).toEqual(['b']);

		useSavedGraphsStore.getState().clear();
		const state = useSavedGraphsStore.getState();
		expect(state.graphs).toHaveLength(0);
		expect(state.fetched).toBe(false);
	});
});
