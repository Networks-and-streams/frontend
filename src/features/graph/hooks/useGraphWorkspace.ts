import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { graphApi } from '../api/graph.api';
import { savedGraphsApi } from '../api/savedGraphs.api';
import { supportsCanvas } from '../lib/canvasSupport';
import { isTraceFor, stepFrame } from '../lib/stepTrace';
import { resultForTarget, resultGraph } from '../lib/graphElements';
import { downloadGraph, graphNameFromFile, readGraphFile } from '../lib/graphFile';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useSavedGraphsStore } from '../store/savedGraphsStore';
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

/** Empty → null (all vertices); a vertex in 1..vertices → that number; otherwise undefined (invalid). */
function parseTarget(text: string, vertices: number): number | null | undefined {
	const trimmed = text.trim();
	if (trimmed === '') return null;
	const value = Number(trimmed);
	return Number.isInteger(value) && value >= 1 && value <= vertices ? value : undefined;
}

type RunState = 'idle' | 'running' | 'error';

/**
 * State and actions of the graph workspace, shared by every workspace layout.
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
export function useGraphWorkspace() {
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
	// Target field: empty = routes to every vertex; a vertex number = only routes to it.
	const [targetText, setTargetText] = useState('');
	const target = parseTarget(targetText, graph.vertices);
	const targetInvalid = target === undefined;

	// A result belongs to the exact graph it was computed for; any edit hides it.
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

	/** Runs the algorithm; resolves true when a result arrived. */
	const handleRun = async (): Promise<boolean> => {
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
				return false;
			}
			setRun({ graph, target: runTarget, response: res });
			setStepIndex(null);
			setRunState('idle');
			return true;
		} catch (error) {
			setRunError(getApiErrorMessage(error));
			setRunState('error');
			// e.g. 429: the daily free limit was reached in another tab.
			if (error instanceof ApiError && error.status === 429) refreshQuota();
			return false;
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

	const resultName = () =>
		t('graphPage.result.graphName', { name: graphName.trim() || t('graphPage.result.untitled') }).slice(0, 120);

	const handleOpenResult = () => {
		if (!shownResult) return;
		openUnsaved(resultName(), resultGraph(graph, shownResult));
		clearRun();
		toast.success(t('graphPage.result.opened'), t('graphPage.result.openedDetail'));
	};

	const handleDownloadResult = () => {
		if (shownResult) downloadGraph(resultName(), resultGraph(graph, shownResult));
	};

	const handleDownload = () => downloadGraph(graphName, graph);

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

	const graphValid = isValidGraph(graph);

	return {
		// graph being edited
		graph,
		graphId,
		graphName,
		isDirty,
		graphValid,
		setGraph,
		setName,
		// saving & files
		saving,
		canSave: !saving && graphName.trim().length > 0 && graphValid,
		handleSave,
		handleNew,
		handleImport,
		handleDownload,
		// running
		algorithm,
		setAlgorithm,
		targetText,
		setTargetText,
		target,
		targetInvalid,
		runState,
		runError,
		handleRun,
		canRun: runState !== 'running' && !outOfRuns && !targetInvalid && graphValid,
		quota,
		outOfRuns,
		// results
		response,
		shownTarget,
		shownResult,
		needsRerun,
		handleOpenResult,
		handleDownloadResult,
		// canvas, text view & step playback
		canvasSupported,
		textView,
		setTextView,
		steps,
		stepIndex,
		setStepIndex,
		frame,
	};
}

export type GraphWorkspace = ReturnType<typeof useGraphWorkspace>;
