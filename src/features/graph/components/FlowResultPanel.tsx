import { useTranslation } from 'react-i18next';
import type { FordFulkersonResult } from '../types';
import { flowPercent } from '../lib/flowFormat';
import type { ViewMode } from '../store/computeResultStore';

interface FlowResultPanelProps {
	result: FordFulkersonResult;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
}

const VIEW_MODES: ViewMode[] = ['flow', 'cut', 'both'];

/**
 * Result panel of the max-flow algorithms (expansion plan §3.4):
 * max_flow as a big number, the flow table (with saturated markers) and the
 * minimum s–t cut block, plus the `Потік | Переріз | Обидва` view switch.
 */
export default function FlowResultPanel({ result, viewMode, onViewModeChange }: FlowResultPanelProps) {
	const { t } = useTranslation();

	const showFlow = viewMode !== 'cut';
	const showCut = viewMode !== 'flow';

	return (
		<div className="flex flex-col gap-4">
			{/* Max flow — the headline number. */}
			<div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3">
				<div className="flex flex-col">
					<span className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">
						{t('graphPage.result.maxFlow')}
					</span>
					<span className="font-mono text-3xl font-bold text-accent">{result.max_flow}</span>
				</div>
				<div className="flex flex-col items-end gap-1 text-[11px] text-foreground/50">
					<span>
						{t('graphPage.result.sourceSink', { source: result.source, sink: result.sink })}
					</span>
					<span>
						{t(result.mode === 'bfs' ? 'graphPage.result.modeBfs' : 'graphPage.result.modeDfs')}
					</span>
				</div>
			</div>

			{/* View switch: flow / cut / both. */}
			<div
				className="flex rounded-xl border border-border bg-muted p-1"
				role="radiogroup"
				aria-label={t('graphPage.result.viewLabel')}
			>
				{VIEW_MODES.map((mode) => (
					<button
						key={mode}
						type="button"
						role="radio"
						aria-checked={viewMode === mode}
						onClick={() => onViewModeChange(mode)}
						className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
							viewMode === mode
								? 'bg-card text-foreground shadow-sm'
								: 'text-foreground/50 hover:text-foreground'
						}`}
					>
						{t(
							mode === 'flow'
								? 'graphPage.result.viewFlow'
								: mode === 'cut'
									? 'graphPage.result.viewCut'
									: 'graphPage.result.viewBoth',
						)}
					</button>
				))}
			</div>

			{/* Flow table. */}
			{showFlow && (
				<div className="flex flex-col gap-2">
					<h4 className="text-[11px] uppercase tracking-[0.2em] text-foreground/40">
						{t('graphPage.result.flowsTable')}
					</h4>
					<div className="flex flex-col gap-1.5">
						{result.flows.map((edge, index) => {
							const percent = flowPercent(edge);
							const saturated = edge.capacity > 0 && edge.flow === edge.capacity;
							return (
								<div
									key={`${edge.from}-${edge.to}-${index}`}
									className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-xs font-mono"
								>
									<span className="text-foreground/70">
										{edge.from} → {edge.to}
									</span>
									<span className="ml-auto text-foreground">
										{edge.flow} / {edge.capacity}
									</span>
									<span className="w-12 text-right text-foreground/50">{percent}%</span>
									{saturated ? (
										<span
											className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
											title={t('graphPage.result.saturated')}
										>
											{t('graphPage.result.saturated')}
										</span>
									) : (
										<span className="w-16" />
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Minimum cut block. */}
			{showCut && (
				<div className="flex flex-col gap-2 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3">
					<div className="flex items-center justify-between">
						<h4 className="text-[11px] uppercase tracking-[0.2em] text-foreground/40">
							{t('graphPage.result.minCut')}
						</h4>
						<span className="font-mono text-sm font-semibold text-rose-400">
							{t('graphPage.result.cutValue')}: {result.min_cut.value}
						</span>
					</div>

					<div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
						<div className="rounded-lg bg-card px-3 py-2">
							<span className="block text-[10px] uppercase tracking-wider text-foreground/40">
								{t('graphPage.result.sourceSide')}
							</span>
							<span className="font-mono text-[#1e3a8a]">
								{result.min_cut.source_side.join(', ') || '—'}
							</span>
						</div>
						<div className="rounded-lg bg-card px-3 py-2">
							<span className="block text-[10px] uppercase tracking-wider text-foreground/40">
								{t('graphPage.result.sinkSide')}
							</span>
							<span className="font-mono text-[#7f1d1d]">
								{result.min_cut.sink_side.join(', ') || '—'}
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] uppercase tracking-wider text-foreground/40">
							{t('graphPage.result.cutEdges')}
						</span>
						{result.min_cut.edges.length === 0 ? (
							<span className="text-xs text-foreground/50">—</span>
						) : (
							result.min_cut.edges.map((edge, index) => (
								<div
									key={`${edge.from}-${edge.to}-${index}`}
									className="flex items-center gap-3 rounded-lg bg-card px-3 py-1.5 text-xs font-mono text-foreground/70"
								>
									<span>
										{edge.from} → {edge.to}
									</span>
									<span className="ml-auto text-foreground/50">
										{t('graphPage.result.capacity')}: {edge.capacity}
									</span>
								</div>
							))
						)}
					</div>
				</div>
			)}

			{/* Legend shared by the canvas and the tables. */}
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-foreground/50">
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-4 rounded-sm bg-[#3b82f6]" />
					{t('graphPage.result.legendSourceSide')}
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-4 rounded-sm bg-[#ef4444]" />
					{t('graphPage.result.legendSinkSide')}
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#ef4444]" />
					{t('graphPage.result.legendCut')}
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block h-0.5 w-4 rounded-sm bg-accent" />
					{t('graphPage.result.legendActivePath')}
				</span>
			</div>
		</div>
	);
}
