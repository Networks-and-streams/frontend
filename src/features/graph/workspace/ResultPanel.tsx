import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon, DownloadIcon, GraphIcon } from '@/shared/icons';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';
import { formatMetricValue, summarizeRoute } from '../lib/edgeMetrics';
import type { GraphInput } from '../types';

/** Run error, "run again" notice, or the computed routes with result actions. */
export default function ResultPanel({ ws }: { ws: GraphWorkspace }) {
	const { t } = useTranslation();
	const { shownResult, shownTarget } = ws;

	if (ws.runState === 'error' && ws.runError) {
		return (
			<div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
				<AlertIcon size={18} className="mt-0.5 shrink-0 text-rose-400" />
				<div className="flex flex-col gap-0.5 text-sm">
					<p className="font-medium text-rose-300">{t('graphPage.run.failedTitle')}</p>
					<p className="text-xs text-rose-300/70">{ws.runError}</p>
				</div>
			</div>
		);
	}

	if (ws.needsRerun) {
		return (
			<StateBlock
				icon={<GraphIcon size={22} />}
				title={t('graphPage.target.rerunTitle')}
				description={t('graphPage.target.rerunDescription')}
			/>
		);
	}

	if (!ws.response) {
		return (
			<StateBlock
				icon={<GraphIcon size={22} />}
				title={t('graphPage.run.noResultsTitle')}
				description={t('graphPage.run.noResultsDescription')}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-semibold text-foreground">
					{shownTarget === null
						? t('graphPage.run.shortestPathsTitle', { source: shownResult?.source })
						: t('graphPage.run.shortestPathsToTitle', { source: shownResult?.source, target: shownTarget })}
				</h3>
				<div className="flex flex-wrap gap-2">
					<Button variant="secondary" size="sm" onClick={ws.handleOpenResult} title={t('graphPage.result.openTitle')}>
						<GraphIcon size={14} />
						{t('graphPage.result.open')}
					</Button>
					<Button variant="ghost" size="sm" onClick={ws.handleDownloadResult}>
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
								<span className="shrink-0 text-foreground/50">{t('graphPage.run.toVertex', { vertex })}</span>
								{routes.length === 0 ? (
									<span className="text-foreground/40">{t('graphPage.run.unreachable')}</span>
								) : (
									<span className="flex min-w-0 flex-col gap-1">
										{routes.map((route) => (
											<span key={route.join('-')} className="flex flex-col gap-1">
												<span className="break-all font-semibold text-accent">{route.join(' → ')}</span>
												<RouteMetrics graph={ws.graph} route={route} />
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
	);
}

/** The graph's extra parameters summarised along one route (e.g. bottleneck throughput). */
function RouteMetrics({ graph, route }: { graph: GraphInput; route: number[] }) {
	const { t } = useTranslation();
	if (!graph.metrics?.length || route.length < 2) return null;

	return (
		<span className="flex flex-wrap gap-1.5 font-sans">
			{summarizeRoute(graph, route).map(({ metric, value, missing }) => (
				<span
					key={metric.key}
					className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] text-foreground/70"
					title={missing > 0 ? t('graphPage.metrics.partial', { count: missing }) : undefined}
				>
					{metric.name} ({t(`graphPage.metrics.aggregatesShort.${metric.aggregate}`)}):{' '}
					<strong className="text-foreground">{value === null ? '—' : formatMetricValue(value)}</strong>
					{missing > 0 && value !== null && <span className="text-amber-300"> *</span>}
				</span>
			))}
		</span>
	);
}
