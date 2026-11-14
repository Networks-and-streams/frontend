import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/app/components/AppShell';
import Button from '@/shared/components/ui/Button/Button';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon, GraphIcon, PlusIcon, SaveIcon, SpinnerIcon } from '@/shared/icons';
import { ApiError, getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { savedGraphsApi } from '../api/savedGraphs.api';
import FlowResultPanel from '../components/FlowResultPanel';
import FlowTraceControls from '../components/FlowTraceControls';
import GraphInputPanel from '../components/GraphInputPanel';
import SavedGraphsPanel from '../components/SavedGraphsPanel';
import { useComputeResultStore } from '../store/computeResultStore';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useSavedGraphsStore } from '../store/savedGraphsStore';
import {
	GRAPH_ALGORITHM,
	isFlowAlgorithm,
	isFlowResult,
	isValidGraph,
	type GraphAlgorithm,
} from '../types';

// Cytoscape + ELK are heavy — load them only when the workspace renders.
const GraphVisualization = lazy(() => import('../components/GraphVisualization'));

/**
 * Graph Resolver workspace.
 *
 * Two distinct state slices:
 * - `savedGraphsStore` — persisted graphs loaded from the backend once per
 *   session (the "My Graphs" collection).
 * - `graphEditorStore` — the graph currently displayed/edited, which may be a
 *   new unsaved graph or a saved graph with local (unsaved) modifications.
 *
 * The computed solution + trace live in `computeResultStore` so the
 * visualization, the trace controls and the result panel share one source of
 * truth. Persistence is explicit: local edits never touch the backend; the
 * editor is synchronized with the canonical backend response only after
 * Save/Update.
 */
export default function GraphPage() {
	const { t } = useTranslation();
	const graph = useGraphEditorStore((s) => s.graph);
	const graphId = useGraphEditorStore((s) => s.graphId);
	const graphName = useGraphEditorStore((s) => s.name);
	const isDirty = useGraphEditorStore((s) => s.isDirty);
	const setGraph = useGraphEditorStore((s) => s.setGraph);
	const setName = useGraphEditorStore((s) => s.setName);
	const startNew = useGraphEditorStore((s) => s.startNew);
	const markSaved = useGraphEditorStore((s) => s.markSaved);
	const markUnsaved = useGraphEditorStore((s) => s.markUnsaved);

	const savedGraphs = useSavedGraphsStore((s) => s.graphs);

	// Computed solution + trace (shared with GraphVisualization/FlowTraceControls).
	const result = useComputeResultStore((s) => s.result);
	const phase = useComputeResultStore((s) => s.phase);
	const error = useComputeResultStore((s) => s.error);
	const steps = useComputeResultStore((s) => s.steps);
	const stepIndex = useComputeResultStore((s) => s.stepIndex);
	const viewMode = useComputeResultStore((s) => s.viewMode);
	const runCompute = useComputeResultStore((s) => s.run);
	const clearResult = useComputeResultStore((s) => s.clear);
	const setViewMode = useComputeResultStore((s) => s.setViewMode);

	const [selectedAlgorithm, setSelectedAlgorithm] = useState<GraphAlgorithm>(GRAPH_ALGORITHM.MINTY);
	const [sink, setSink] = useState<number>(graph.vertices);
	const [saving, setSaving] = useState(false);

	// The currently open saved graph vanished from the collection (deleted
	// locally/elsewhere) — detach the editor without losing its content.
	useEffect(() => {
		const editor = useGraphEditorStore.getState();
		if (editor.graphId && !useSavedGraphsStore.getState().getGraph(editor.graphId)) {
			editor.markUnsaved();
		}
	}, [savedGraphs]);

	// Warn when leaving/reloading the page with unsaved changes.
	useEffect(() => {
		const handler = (event: BeforeUnloadEvent) => {
			if (useGraphEditorStore.getState().isDirty) {
				event.preventDefault();
				event.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, []);

	// Editing the graph invalidates the previous solution/trace.
	useEffect(() => {
		clearResult();
	}, [graph, clearResult]);

	// Never leave the playback timer running behind.
	useEffect(() => () => useComputeResultStore.getState().pause(), []);

	// Keep the sink inside the vertex range as the graph grows/shrinks.
	useEffect(() => {
		setSink((current) => Math.min(Math.max(current, 1), graph.vertices));
	}, [graph.vertices]);

	const needsSink = isFlowAlgorithm(selectedAlgorithm);

	const handleRun = async () => {
		if (!isValidGraph(graph)) return;
		if (needsSink && (sink < 1 || sink > graph.vertices)) return;
		await runCompute(graph, selectedAlgorithm, sink);
	};

	const handleNew = () => {
		startNew();
		clearResult();
	};

	/**
	 * Save / Save as new.
	 * - New or "as new": POST /graphs (create).
	 * - Saved graph: PATCH /graphs/:id (update).
	 * The backend response is canonical: Zustand is updated from it and the
	 * editor is marked clean.
	 */
	const handleSave = async (asNew: boolean) => {
		const trimmedName = graphName.trim();
		if (!trimmedName || saving) return;

		setSaving(true);
		try {
			const saved =
				asNew || !graphId
					? await savedGraphsApi.createGraph({ name: trimmedName, graph })
					: await savedGraphsApi.updateGraph(graphId, { name: trimmedName, graph });

			const store = useSavedGraphsStore.getState();
			if (asNew || !graphId) store.addGraph(saved);
			else store.updateGraph(saved);

			markSaved(saved.id, saved.name, saved.graph);
			const toastTitle = asNew
				? t('graphPage.toasts.savedAsNew')
				: graphId
					? t('graphPage.toasts.updated')
					: t('graphPage.toasts.saved');
			toast.success(toastTitle, saved.name);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404 && graphId) {
				// The saved graph no longer exists — drop the stale reference and
				// keep the content as an editable new graph.
				useSavedGraphsStore.getState().removeGraph(graphId);
				markUnsaved();
				toast.error(t('graphPage.toasts.noLongerExists'), t('graphPage.toasts.noLongerExistsDetail'));
			} else {
				toast.error(t('graphPage.toasts.couldNotSave'), getApiErrorMessage(error));
			}
		} finally {
			setSaving(false);
		}
	};

	const canSave = !saving && graphName.trim().length > 0 && isValidGraph(graph);
	const statusBadge = isDirty ? (
		<span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
			{t('graphPage.saveCard.unsaved')}
		</span>
	) : graphId ? (
		<span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
			{t('graphPage.saveCard.saved')}
		</span>
	) : null;

	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('common.appName')}</h1>
					<p className="text-sm text-foreground/50">{t('graphPage.subtitle')}</p>
				</div>

				<div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
					<section className="flex flex-col gap-3 lg:self-start">
						{/* My Graphs — saved graphs loaded into Zustand once per session. */}
						<div className="rounded-3xl border border-border bg-card p-5">
							<SavedGraphsPanel openGraphId={graphId} />
						</div>

						{/* Save controls for the currently edited graph. */}
						<div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
							<div className="flex items-center justify-between gap-2">
								<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
									{t('graphPage.saveCard.title')}
								</h2>
								<div className="flex items-center gap-2">
									{statusBadge}
									<Button
										variant="ghost"
										size="sm"
										onClick={handleNew}
										title={t('graphPage.saveCard.newTitle')}
									>
										<PlusIcon size={14} />
										{t('graphPage.saveCard.new')}
									</Button>
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								<label htmlFor="graph-name" className="text-xs text-foreground/50">
									{t('graphPage.saveCard.name')}
								</label>
								<input
									id="graph-name"
									type="text"
									value={graphName}
									onChange={(e) => setName(e.target.value)}
									placeholder={t('graphPage.saveCard.namePlaceholder')}
									className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-foreground/30 transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
								/>
							</div>

							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<Button
									variant="primary"
									onClick={() => handleSave(false)}
									disabled={!canSave}
									className="w-full"
								>
									{saving ? (
										<>
											<SpinnerIcon size={15} className="animate-spin" />
											{t('graphPage.saveCard.saving')}
										</>
									) : (
										<>
											<SaveIcon size={15} />
											{graphId ? t('graphPage.saveCard.saveChanges') : t('graphPage.saveCard.save')}
										</>
									)}
								</Button>
								<Button
									variant="secondary"
									onClick={() => handleSave(true)}
									disabled={!canSave}
									title={t('graphPage.saveCard.saveAsNewTitle')}
									className="w-full"
								>
									{t('graphPage.saveCard.saveAsNew')}
								</Button>
							</div>

							<p className="text-[11px] leading-relaxed text-foreground/40">
								{graphId ? t('graphPage.saveCard.hasChangesInfo') : t('graphPage.saveCard.newGraphInfo')}
							</p>
						</div>

						<div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
							<GraphInputPanel value={graph} onChange={setGraph} />

							<div className="mt-2 flex flex-col gap-3 border-t border-border-subtle pt-4">
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="algorithm-select"
										className="text-xs uppercase tracking-[0.2em] text-foreground/40"
									>
										{t('graphPage.algorithm.label')}
									</label>
									<select
										id="algorithm-select"
										value={selectedAlgorithm}
										onChange={(e) => setSelectedAlgorithm(e.target.value as GraphAlgorithm)}
										className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
									>
										<option value={GRAPH_ALGORITHM.MINTY}>{t('graphPage.algorithm.minty')}</option>
										<option value={GRAPH_ALGORITHM.FORD_FULKERSON}>
											{t('graphPage.algorithm.fordFulkerson')}
										</option>
										<option value={GRAPH_ALGORITHM.EDMONDS_KARP}>
											{t('graphPage.algorithm.edmondsKarp')}
										</option>
									</select>
								</div>

								{/* Flow algorithms additionally need the sink vertex. */}
								{needsSink && (
									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="sink-input"
											className="text-xs uppercase tracking-[0.2em] text-foreground/40"
										>
											{t('graphPage.input.sinkVertex')}
										</label>
										<input
											id="sink-input"
											type="number"
											min={1}
											max={graph.vertices}
											value={sink}
											onChange={(e) => setSink(Number(e.target.value))}
											className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
										/>
										<span className="text-[11px] text-foreground/40">
											{t('graphPage.input.sinkHint', { vertices: graph.vertices })}
										</span>
									</div>
								)}

								<Button
									variant="primary"
									onClick={handleRun}
									disabled={phase === 'running' || !isValidGraph(graph)}
									className="w-full"
								>
									{phase === 'running' ? (
										<>
											<SpinnerIcon size={16} className="animate-spin" />
											{t('graphPage.algorithm.solving')}
										</>
									) : (
										<>{t('graphPage.algorithm.run')}</>
									)}
								</Button>
							</div>
						</div>
					</section>

					<section className="flex min-w-0 flex-col gap-6">
						<div className="rounded-3xl border border-border bg-card p-4">
							<Suspense fallback={<div className="h-[380px] w-full animate-pulse rounded-2xl bg-muted/40" />}>
								<GraphVisualization
									graph={graph}
									result={result}
									step={steps[stepIndex] ?? null}
									viewMode={viewMode}
								/>
							</Suspense>
						</div>

						{/* Trace playback: frame counter + step message (§3.5). */}
						<FlowTraceControls />

						<div className="rounded-3xl border border-border bg-card p-5 space-y-4">
							{phase === 'error' && error ? (
								<div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
									<AlertIcon size={18} className="mt-0.5 shrink-0 text-rose-400" />
									<div className="flex flex-col gap-0.5 text-sm">
										<p className="font-medium text-rose-300">{t('graphPage.run.failedTitle')}</p>
										<p className="text-xs text-rose-300/70">{error}</p>
									</div>
								</div>
							) : result && isFlowResult(result) ? (
								<FlowResultPanel
									result={result}
									viewMode={viewMode}
									onViewModeChange={setViewMode}
								/>
							) : result ? (
								<div className="flex flex-col gap-4">
									<h3 className="text-sm font-semibold text-foreground">
										{t('graphPage.run.shortestPathsTitle', { source: result.source })}
									</h3>

									{/* Every tied shortest route to each reachable vertex. */}
									<div className="flex flex-col gap-2">
										{Object.entries(result.paths).map(([targetVertex, routes]) => {
											const weight = result.distances[targetVertex];

											// Skip the source vertex when its route is just itself.
											if (Number(targetVertex) === result.source && routes.every((r) => r.length <= 1)) {
												return null;
											}

											return (
												<div
													key={targetVertex}
													className="flex flex-col gap-1.5 rounded-xl border border-border/50 bg-muted px-4 py-3 text-xs font-mono text-foreground"
												>
													<div className="flex items-center justify-between gap-2">
														<span className="text-foreground/50">
															{t('graphPage.run.toVertex', { vertex: targetVertex })}
														</span>
														<span className="rounded-lg border border-border bg-card px-2.5 py-1 text-foreground/80">
															{t('graphPage.run.weight')}{' '}
															<strong className="text-foreground">
																{weight === null || weight === undefined ? '—' : weight}
															</strong>
														</span>
													</div>
													{routes.map((route, routeIndex) => (
														<span key={routeIndex} className="font-semibold text-accent">
															{route.join(' -> ')}
														</span>
													))}
												</div>
											);
										})}
									</div>

									{result.truncated && (
										<p className="text-[11px] text-foreground/40">
											{t('graphPage.result.truncated')}
										</p>
									)}
								</div>
							) : (
								<StateBlock
									icon={<GraphIcon size={22} />}
									title={t('graphPage.run.noResultsTitle')}
									description={t('graphPage.run.noResultsDescription')}
								/>
							)}
						</div>
					</section>
				</div>
			</div>
		</AppShell>
	);
}