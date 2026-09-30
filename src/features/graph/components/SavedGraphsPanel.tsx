// src/features/graph/components/SavedGraphsPanel.tsx
import { useState } from 'react';
import Button from '@/shared/components/ui/Button/Button';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon, GraphIcon, SpinnerIcon, TrashIcon } from '@/shared/icons';
import { ApiError, getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { savedGraphsApi } from '../api/savedGraphs.api';
import { useSavedGraphsStore } from '../store/savedGraphsStore';
import { useGraphEditorStore } from '../store/graphEditorStore';
import type { SavedGraph } from '../types';

interface SavedGraphsPanelProps {
	/** Id of the graph currently open in the editor (highlighted in the list). */
	openGraphId: string | null;
}

function formatUpdatedAt(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/**
 * "My Graphs" list. Reads the saved-graphs collection directly from Zustand
 * (loaded once per session), so opening a graph is an instant local selection.
 */
export default function SavedGraphsPanel({ openGraphId }: SavedGraphsPanelProps) {
	const graphs = useSavedGraphsStore((s) => s.graphs);
	const isLoading = useSavedGraphsStore((s) => s.isLoading);
	const error = useSavedGraphsStore((s) => s.error);
	const fetchGraphs = useSavedGraphsStore((s) => s.fetchGraphs);

	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const handleOpen = async (graph: SavedGraph) => {
		// Normal path: the graph is already in the store (instant, no request).
		if (useSavedGraphsStore.getState().getGraph(graph.id)) {
			useGraphEditorStore.getState().loadSaved(graph.id, graph.name, graph.graph);
			return;
		}

		// Stale reference — the graph no longer exists in the collection.
		try {
			const fetched = await savedGraphsApi.getGraph(graph.id);
			useSavedGraphsStore.getState().addGraph(fetched);
			useGraphEditorStore.getState().loadSaved(fetched.id, fetched.name, fetched.graph);
		} catch (openError) {
			if (openError instanceof ApiError && openError.status === 404) {
				useSavedGraphsStore.getState().removeGraph(graph.id);
				toast.error('Graph no longer exists', 'It may have been deleted.');
			} else {
				toast.error('Could not open graph', getApiErrorMessage(openError));
			}
		}
	};

	const handleDelete = async (id: string) => {
		setDeletingId(id);
		try {
			await savedGraphsApi.deleteGraph(id);
			useSavedGraphsStore.getState().removeGraph(id);
			toast.success('Graph deleted');
		} catch (deleteError) {
			if (deleteError instanceof ApiError && deleteError.status === 404) {
				// Already gone — drop the stale reference locally.
				useSavedGraphsStore.getState().removeGraph(id);
				toast.error('Graph no longer exists', 'It may have been deleted.');
			} else {
				toast.error('Could not delete graph', getApiErrorMessage(deleteError));
			}
		} finally {
			setDeletingId(null);
			setConfirmingId(null);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">My Graphs</h2>
				{graphs.length > 0 && (
					<span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground/50">
						{graphs.length}
					</span>
				)}
			</div>

			{graphs.length > 0 ? (
				<ul className="flex flex-col gap-2">
					{graphs.map((graph) => {
						const isOpen = graph.id === openGraphId;
						const isConfirming = confirmingId === graph.id;
						const isDeleting = deletingId === graph.id;
						const updatedAt = formatUpdatedAt(graph.updatedAt);

						return (
							<li
								key={graph.id}
								className={`flex items-center gap-2 rounded-2xl border p-2.5 transition-colors ${
									isOpen
										? 'border-accent/40 bg-accent/5'
										: 'border-border/50 bg-muted/50 hover:border-border'
								}`}
							>
								<button
									type="button"
									onClick={() => handleOpen(graph)}
									className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left"
									title={`Open "${graph.name}"`}
								>
									<GraphIcon size={16} className={`shrink-0 ${isOpen ? 'text-accent' : 'text-foreground/40'}`} />
									<span className="flex min-w-0 flex-col gap-0.5">
										<span className="truncate text-sm font-medium text-foreground">{graph.name}</span>
										{updatedAt && (
											<span className="text-[11px] text-foreground/40">Updated {updatedAt}</span>
										)}
									</span>
								</button>

								{isConfirming ? (
									<span className="flex items-center gap-1.5">
										<span className="text-[11px] text-foreground/50">Delete?</span>
										<Button variant="danger" size="sm" onClick={() => handleDelete(graph.id)} disabled={isDeleting}>
											{isDeleting ? 'Deleting…' : 'Yes'}
										</Button>
										<Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
											No
										</Button>
									</span>
								) : (
									<button
										type="button"
										onClick={() => setConfirmingId(graph.id)}
										className="rounded-lg p-1.5 text-foreground/30 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
										title="Delete graph"
										aria-label={`Delete ${graph.name}`}
									>
										<TrashIcon size={15} />
									</button>
								)}
							</li>
						);
					})}
				</ul>
			) : isLoading ? (
				<div className="flex items-center justify-center gap-2 py-8 text-foreground/40">
					<SpinnerIcon size={16} className="animate-spin" />
					<span className="text-sm">Loading saved graphs…</span>
				</div>
			) : error ? (
				<StateBlock
					icon={<AlertIcon size={20} />}
					title="Could not load saved graphs"
					description={error}
					action={
						<Button variant="secondary" size="sm" onClick={() => void fetchGraphs()}>
							Retry
						</Button>
					}
					className="py-8"
				/>
			) : (
				<StateBlock
					icon={<GraphIcon size={20} />}
					title="No saved graphs yet"
					description="Save a graph from the editor below to reuse it later."
					className="py-8"
				/>
			)}
		</div>
	);
}