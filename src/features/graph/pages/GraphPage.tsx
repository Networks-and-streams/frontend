import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '@/app/components/AppShell';
import Button from '@/shared/components/ui/Button/Button';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon, DownloadIcon, FileTextIcon, GraphIcon, PlusIcon, SaveIcon, SpinnerIcon } from '@/shared/icons';
import { ApiError, getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { graphApi } from '../api/graph.api';
import { savedGraphsApi } from '../api/savedGraphs.api';
import GraphInputPanel from '../components/GraphInputPanel';
import SavedGraphsPanel from '../components/SavedGraphsPanel';
import StepPlayer from '../components/StepPlayer';
import CanvasErrorBoundary from '../components/CanvasErrorBoundary';
import GraphTextView from '../components/GraphTextView';
import { supportsCanvas } from '../lib/canvasSupport';
import { isTraceFor, stepFrame } from '../lib/stepTrace';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useSavedGraphsStore } from '../store/savedGraphsStore';
import { resultForTarget, resultGraph } from '../lib/graphElements';
import { downloadGraph, GRAPH_FILE_ACCEPT, graphNameFromFile, readGraphFile } from '../lib/graphFile';
import {
	GRAPH_ALGORITHM,
	isValidGraph,
	type ComputeQuota,
	type ComputeResponse,
	type GraphAlgorithm,
	type GraphInput,
} from '../types';

const TEXT_VIEW_KEY = 'graph.textView';

function readTextViewPreference(): boolean {
	try {
		return window.localStorage.getItem(TEXT_VIEW_KEY) === '1';
	} catch {
		return false;
	}
}

/** Datalist suggestions are capped; any vertex number can still be typed. */
const MAX_TARGET_SUGGESTIONS = 500;

/** Empty → null (all vertices); a vertex in 1..vertices → that number; otherwise undefined (invalid). */
function parseTarget(text: string, vertices: number): number | null | undefined {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const value = Number(trimmed);
	return Number.isInteger(value) && value >= 1 && value <= vertices ? value : undefined;
}

// Cytoscape + ELK are heavy — load them only when the workspace renders.
const GraphVisualization = lazy(() => import('../components/GraphVisualization'));

type RunState = 'idle' | 'running' | 'error';

/**
 * Graph Resolver workspace.
 *
 * Two distinct state slices:
 * - `savedGraphsStore` — persisted graphs loaded from the backend once per
 *   session (the "My Graphs" collection).
 * - `graphEditorStore` — the graph currently displayed/edited, which may be a
 *   new unsaved graph or a saved graph with local (unsaved) modifications.
 *
 * Persistence is explicit: local edits never touch the backend; the editor is
 * synchronized with the canonical backend response only after Save/Update.
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
	const openUnsaved = useGraphEditorStore((s) => s.openUnsaved);
	const markSaved = useGraphEditorStore((s) => s.markSaved);
	const markUnsaved = useGraphEditorStore((s) => s.markUnsaved);

	const savedGraphs = useSavedGraphsStore((s) => s.graphs);

	const [algorithm, setAlgorithm] = useState<GraphAlgorithm>(GRAPH_ALGORITHM.MINTY);
	const [runState, setRunState] = useState<RunState>('idle');
	const [runError, setRunError] = useState<string | null>(null);
	// A result belongs to the exact graph it was computed for; any edit hides it.
	// Target field: empty = routes to every vertex; a vertex number = only routes to it.
	const [targetText, setTargetText] = useState('');
	const target = parseTarget(targetText, graph.vertices);
	const targetInvalid = target === undefined;

	const [run, setRun] = useState<{ graph: GraphInput; target: number | null; response: ComputeResponse } | null>(
		null,
	);
	const response = run?.graph === graph ? run.response : null;
	// A run for all vertices can be narrowed to any typed target locally; a run
	// for one target only answers that target (compute did not search others).
	const shownTarget = targetInvalid ? null : target;
	const shownResult =
		run && response?.result
			? run.target === shownTarget
				? response.result
				: run.target === null
					? resultForTarget(response.result, shownTarget)
					: null
			: null;
	const needsRerun = Boolean(response?.result) && shownResult === null;

	// Canvas or accessible text view (remembered per browser when storage works).
	const [canvasSupported] = useState(supportsCanvas);
	const [textView, setTextViewState] = useState(readTextViewPreference);
	const setTextView = (next: boolean) => {
		setTextViewState(next);
		try {
			window.localStorage.setItem(TEXT_VIEW_KEY, next ? '1' : '0');
		} catch {
			// Storage blocked (private mode etc.): the choice just is not remembered.
		}
	};

	// Step playback: null = show the final result.
	const [stepIndex, setStepIndex] = useState<number | null>(null);
	const steps = response && isTraceFor(graph, response.steps) ? response.steps : null;
	const frame = useMemo(
		() => (steps && stepIndex !== null && stepIndex < steps.length ? stepFrame(graph, steps, stepIndex) : null),
		[graph, steps, stepIndex],
	);
	const [quota, setQuota] = useState<ComputeQuota | null>(null);
	const [saving, setSaving] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const outOfRuns = quota !== null && !quota.unlimited && quota.remaining === 0;

	const refreshQuota = () => {
		graphApi
			.getQuota()
			.then(setQuota)
			.catch(() => setQuota(null));
	};

	useEffect(refreshQuota, []);

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

	const handleRun = async () => {
		setRunState('running');
		setRunError(null);
		try {
			const runTarget = target ?? null;
			const res = await graphApi.execute({
				algorithm,
				graph,
				options: { includeSteps: true, target: runTarget },
			});
			setQuota(res.quota);
			if (res.status !== 'ok') {
				setRun(null);
				setRunError(res.error || res.status);
				setRunState('error');
				return;
			}
			setRun({ graph, target: runTarget, response: res });
			setStepIndex(null);
			setRunState('idle');
		} catch (error) {
			setRunError(getApiErrorMessage(error));
			setRunState('error');
			// e.g. 429: the daily free limit was reached in another tab.
			if (error instanceof ApiError && error.status === 429) refreshQuota();
		}
	};

	const clearRun = () => {
		setRun(null);
		setRunError(null);
		setRunState('idle');
	};

	const handleImport = async (file: File | undefined) => {
		if (!file) return;
		try {
			openUnsaved(graphNameFromFile(file.name), await readGraphFile(file));
			clearRun();
			toast.success(t('graphPage.file.imported'), file.name);
		} catch (error) {
			toast.error(t('graphPage.file.importFailed'), getApiErrorMessage(error));
		}
	};

	const handleOpenResult = () => {
		if (!shownResult) return;
		const name = t('graphPage.result.graphName', { name: graphName.trim() || t('graphPage.result.untitled') });
		openUnsaved(name.slice(0, 120), resultGraph(graph, shownResult));
		clearRun();
		toast.success(t('graphPage.result.opened'), t('graphPage.result.openedDetail'));
	};

	const handleNew = () => {
		startNew();
		clearRun();
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

							<div className="grid grid-cols-2 gap-2">
								<Button
									variant="secondary"
									size="sm"
									onClick={() => fileInputRef.current?.click()}
									title={t('graphPage.file.importTitle')}
								>
									<FileTextIcon size={14} />
									{t('graphPage.file.import')}
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => downloadGraph(graphName, graph)}
									disabled={!isValidGraph(graph)}
									title={t('graphPage.file.downloadTitle')}
								>
									<DownloadIcon size={14} />
									{t('graphPage.file.download')}
								</Button>
								<input
									ref={fileInputRef}
									type="file"
									accept={GRAPH_FILE_ACCEPT}
									className="hidden"
									onChange={(e) => {
										void handleImport(e.target.files?.[0]);
										// Allow importing the same file again.
										e.target.value = '';
									}}
								/>
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
										value={algorithm}
										onChange={(e) => setAlgorithm(e.target.value as GraphAlgorithm)}
										className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
									>
										<option value={GRAPH_ALGORITHM.MINTY}>{t('graphPage.algorithm.minty')}</option>
										<option value={GRAPH_ALGORITHM.FORD_FULKERSON}>
											{t('graphPage.algorithm.fordFulkerson')}
										</option>
									</select>
								</div>

								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="target-input"
										className="text-xs uppercase tracking-[0.2em] text-foreground/40"
									>
										{t('graphPage.target.label')}
									</label>
									<div className="flex gap-2">
										<input
											id="target-input"
											type="text"
											inputMode="numeric"
											autoComplete="off"
											list="target-vertices"
											value={targetText}
											onChange={(e) => setTargetText(e.target.value)}
											placeholder={t('graphPage.target.placeholder')}
											aria-invalid={targetInvalid}
											aria-describedby="target-help"
											className={`h-10 min-w-0 flex-1 rounded-xl border bg-muted px-3 text-sm text-foreground transition-all duration-200 placeholder:text-foreground/30 focus:outline-none focus:ring-2 ${
												targetInvalid
													? 'border-rose-500/50 focus:ring-rose-500/20'
													: 'border-border focus:border-accent/50 focus:ring-accent/20'
											}`}
										/>
										{targetText !== '' && (
											<Button variant="ghost" size="sm" onClick={() => setTargetText('')}>
												{t('graphPage.target.clear')}
											</Button>
										)}
									</div>
									<datalist id="target-vertices">
										{Array.from({ length: Math.min(graph.vertices, MAX_TARGET_SUGGESTIONS) }, (_, i) => (
											<option key={i + 1} value={i + 1} />
										))}
									</datalist>
									<p
										id="target-help"
										className={`text-[11px] ${targetInvalid ? 'text-rose-300' : 'text-foreground/40'}`}
									>
										{targetInvalid
											? t('graphPage.target.invalid', { max: graph.vertices })
											: target === null
												? t('graphPage.target.allHint')
												: t('graphPage.target.oneHint', { vertex: target })}
									</p>
								</div>

								<Button
									variant="primary"
									onClick={handleRun}
									disabled={runState === 'running' || outOfRuns || targetInvalid || !isValidGraph(graph)}
									className="w-full"
								>
									{runState === 'running' ? (
										<>
											<SpinnerIcon size={16} className="animate-spin" />
											{t('graphPage.algorithm.solving')}
										</>
									) : (
										<>{t('graphPage.algorithm.run')}</>
									)}
								</Button>

								{quota && (
									<p className="text-[11px] leading-relaxed text-foreground/50">
										{quota.requiresVerification ? (
											<>
												{t('graphPage.quota.verifyFirst')}{' '}
												<Link to="/profile" className="font-medium text-accent hover:underline">
													{t('graphPage.quota.verifyLink')}
												</Link>{' '}
											</>
										) : quota.unlimited ? (
											t('graphPage.quota.unlimited')
										) : (
											t('graphPage.quota.remaining', { remaining: quota.remaining, limit: quota.limit })
										)}{' '}
										{!quota.unlimited && (
											<Link to="/subscribe" className="font-medium text-accent hover:underline">
												{outOfRuns ? t('graphPage.quota.upgradeNow') : t('graphPage.quota.upgrade')}
											</Link>
										)}
									</p>
								)}
							</div>
						</div>
					</section>

					<section className="flex min-w-0 flex-col gap-6">
						<div className="rounded-3xl border border-border bg-card p-4">
							<div className="mb-3 flex justify-end">
								{canvasSupported && (
									<Button variant="ghost" size="sm" onClick={() => setTextView(!textView)} aria-pressed={textView}>
										{textView ? t('graphPage.text.showCanvas') : t('graphPage.text.showText')}
									</Button>
								)}
							</div>
							{textView || !canvasSupported ? (
								<GraphTextView
									graph={graph}
									result={frame ? null : shownResult}
									frame={frame}
									notice={canvasSupported ? undefined : t('graphPage.text.unsupported')}
								/>
							) : (
								<CanvasErrorBoundary
									fallback={
										<GraphTextView
											graph={graph}
											result={frame ? null : shownResult}
											frame={frame}
											notice={t('graphPage.text.crashed')}
										/>
									}
								>
									<Suspense fallback={<div className="h-[380px] w-full animate-pulse rounded-2xl bg-muted/40" />}>
										<GraphVisualization
											graph={graph}
											result={frame ? null : shownResult}
											frame={frame}
											onChange={setGraph}
										/>
									</Suspense>
								</CanvasErrorBoundary>
							)}
							{steps && !needsRerun && (
								<div className="mt-3">
									<StepPlayer
										total={steps.length}
										index={frame ? stepIndex : null}
										frame={frame}
										onIndexChange={setStepIndex}
									/>
								</div>
							)}
						</div>

						<div className="rounded-3xl border border-border bg-card p-5 space-y-4">
							{runState === 'error' && runError ? (
								<div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
									<AlertIcon size={18} className="mt-0.5 shrink-0 text-rose-400" />
									<div className="flex flex-col gap-0.5 text-sm">
										<p className="font-medium text-rose-300">{t('graphPage.run.failedTitle')}</p>
										<p className="text-xs text-rose-300/70">{runError}</p>
									</div>
								</div>
							) : needsRerun ? (
								<StateBlock
									icon={<GraphIcon size={22} />}
									title={t('graphPage.target.rerunTitle')}
									description={t('graphPage.target.rerunDescription')}
								/>
							) : response ? (
								<div className="flex flex-col gap-4">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<h3 className="text-sm font-semibold text-foreground">
											{shownTarget === null
												? t('graphPage.run.shortestPathsTitle', { source: shownResult?.source })
												: t('graphPage.run.shortestPathsToTitle', {
														source: shownResult?.source,
														target: shownTarget,
													})}
										</h3>
										<div className="flex flex-wrap gap-2">
											<Button
												variant="secondary"
												size="sm"
												onClick={handleOpenResult}
												title={t('graphPage.result.openTitle')}
											>
												<GraphIcon size={14} />
												{t('graphPage.result.open')}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													downloadGraph(
														t('graphPage.result.graphName', {
															name: graphName.trim() || t('graphPage.result.untitled'),
														}),
														resultGraph(graph, shownResult),
													)
												}
											>
												<DownloadIcon size={14} />
												{t('graphPage.result.download')}
											</Button>
										</div>
									</div>

									{shownResult?.truncated && (
										<p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
											{t('graphPage.run.truncated')}
										</p>
									)}

									{/* Solver result rows: every shortest route to each vertex shown. */}
									<ul className="flex flex-col gap-2">
										{Object.entries(shownResult?.paths ?? {}).map(([targetVertex, routes]) => {
											const vertex = Number(targetVertex);
											// In "all vertices" mode the source's trivial route is noise.
											if (shownTarget === null && vertex === shownResult?.source) return null;
											const distance = shownResult?.distances?.[targetVertex] ?? null;

											return (
												<li
													key={targetVertex}
													className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted px-4 py-3 font-mono text-xs text-foreground"
												>
													<div className="flex min-w-0 items-start gap-2">
														<span className="shrink-0 text-foreground/50">
															{t('graphPage.run.toVertex', { vertex })}
														</span>
														{routes.length === 0 ? (
															<span className="text-foreground/40">{t('graphPage.run.unreachable')}</span>
														) : (
															<span className="flex min-w-0 flex-col gap-1">
																{routes.map((route) => (
																	<span key={route.join('-')} className="break-all font-semibold text-accent">
																		{route.join(' → ')}
																	</span>
																))}
																{routes.length > 1 && (
																	<span className="font-sans text-[11px] text-foreground/40">
																		{t('graphPage.run.equalRoutes', { count: routes.length })}
																	</span>
																)}
															</span>
														)}
													</div>
													{distance !== null && (
														<span className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1 text-foreground/80">
															{t('graphPage.run.weight')} <strong className="text-foreground">{distance}</strong>
														</span>
													)}
												</li>
											);
										})}
									</ul>
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