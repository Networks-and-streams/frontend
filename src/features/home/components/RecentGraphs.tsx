import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import SectionHeading from '@/shared/components/ui/SectionHeading/SectionHeading';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { formatDateTime } from '@/shared/utils';
import { AlertIcon, ArrowRightIcon, GraphIcon, PlusIcon, SpinnerIcon } from '@/shared/icons';
import { useGraphEditorStore } from '@/features/graph/store/graphEditorStore';
import { useSavedGraphsStore } from '@/features/graph/store/savedGraphsStore';
import type { SavedGraph } from '@/features/graph/types';
import { RECENT_GRAPHS_LIMIT } from '../constants';

/** Formats a saved-graph timestamp, tolerating bad input. */
function formatUpdatedAt(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '' : formatDateTime(value);
}

/**
 * "Recent graphs" — the most recently updated saved graphs, read directly from
 * the existing saved-graphs store (no separate state). Opening a graph loads it
 * into the shared editor and navigates to the workspace. Falls back to loading,
 * error and empty states, all with a route back to the workspace.
 */
export default function RecentGraphs() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const graphs = useSavedGraphsStore((s) => s.graphs);
	const isLoading = useSavedGraphsStore((s) => s.isLoading);
	const error = useSavedGraphsStore((s) => s.error);
	const fetchGraphs = useSavedGraphsStore((s) => s.fetchGraphs);

	const recent = graphs.slice(0, RECENT_GRAPHS_LIMIT);

	const createGraph = () => {
		useGraphEditorStore.getState().startNew();
		navigate('/graph');
	};

	const openGraph = (graph: SavedGraph) => {
		useGraphEditorStore.getState().loadSaved(graph.id, graph.name, graph.graph);
		navigate('/graph');
	};

	return (
		<section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SectionHeading icon={<GraphIcon size={16} />} title={t('home.recent.title')} />
				{graphs.length > 0 && (
					<Button variant="ghost" size="sm" onClick={() => navigate('/graph')}>
						{t('home.recent.viewAll')}
						<ArrowRightIcon size={14} />
					</Button>
				)}
			</div>

			{graphs.length > 0 ? (
				<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{recent.map((graph) => {
						const updatedAt = formatUpdatedAt(graph.updatedAt);
						return (
							<li key={graph.id}>
								<button
									type="button"
									onClick={() => openGraph(graph)}
									title={t('home.recent.open', { name: graph.name })}
									className="group flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-muted/50 p-3 text-left transition-colors hover:border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
								>
									<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
										<GraphIcon size={16} />
									</span>
									<span className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="truncate text-sm font-medium text-foreground">{graph.name}</span>
										{updatedAt && (
											<span className="truncate text-[11px] text-foreground/40">
												{t('home.recent.updated', { date: updatedAt })}
											</span>
										)}
									</span>
									<ArrowRightIcon
										size={16}
										className="shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5"
									/>
								</button>
							</li>
						);
					})}
				</ul>
			) : isLoading ? (
				<div className="flex items-center justify-center gap-2 py-10 text-foreground/40">
					<SpinnerIcon size={16} className="animate-spin" />
					<span className="text-sm">{t('home.recent.loading')}</span>
				</div>
			) : error ? (
				<StateBlock
					icon={<AlertIcon size={20} />}
					title={t('home.recent.errorTitle')}
					description={error}
					action={
						<Button variant="secondary" size="sm" onClick={() => void fetchGraphs()}>
							{t('common.retry')}
						</Button>
					}
					className="py-10"
				/>
			) : (
				<StateBlock
					icon={<GraphIcon size={20} />}
					title={t('home.recent.emptyTitle')}
					description={t('home.recent.emptyDescription')}
					action={
						<Button variant="primary" size="sm" onClick={createGraph}>
							<PlusIcon size={14} />
							{t('home.recent.createFirst')}
						</Button>
					}
					className="py-10"
				/>
			)}
		</section>
	);
}
