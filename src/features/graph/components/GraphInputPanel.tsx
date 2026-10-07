import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { MAX_METRICS, MAX_METRIC_NAME, METRIC_AGGREGATES, SAMPLE_GRAPH, isValidGraph, type GraphInput, type MetricAggregate } from '../types';
import { addMetric, removeMetric, setEdgeValue, updateMetric } from '../lib/edgeMetrics';

interface GraphInputPanelProps {
	value: GraphInput;
	onChange: (graph: GraphInput) => void;
	onInvalid?: (message: string) => void;
}

/*
 * Shared field styling — mirrors the design tokens used across the app
 * (GraphPage name input / algorithm select): rounded-xl control radius, muted
 * background, full border, accent focus ring, uniform height and transition.
 * Edge cells use the same recipe at a slightly smaller scale (`h-9`).
 */
const fieldBase =
	'w-full border bg-muted text-sm text-foreground transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20';
const mainFieldClass = `${fieldBase} h-10 rounded-xl border-border px-3`;
const cellFieldClass = `${fieldBase} h-9 rounded-lg border-border bg-card px-1 text-center font-mono`;

/** Interactive table-based editor for the graph definition with validation. */
export default function GraphInputPanel({ value, onChange, onInvalid }: GraphInputPanelProps) {
	const { t } = useTranslation();
	const [error, setError] = useState<string | null>(null);

	const runError = (message: string) => {
		setError(message);
		onInvalid?.(message);
	};

	const validateAndChange = (nextGraph: GraphInput) => {
		if (!isValidGraph(nextGraph)) {
			runError(t('graphPage.input.invalid'));
		} else {
			setError(null);
		}
		onChange(nextGraph);
	};

	const handleVerticesChange = (vertices: number) => {
		validateAndChange({
			...value,
			vertices: Math.max(1, vertices),
		});
	};

	const handleSourceChange = (source: number) => {
		validateAndChange({
			...value,
			source: Math.max(1, source),
		});
	};

	const addEdge = () => {
		validateAndChange({
			...value,
			edges: [...value.edges, { from: 1, to: Math.min(2, value.vertices), weight: 1 }],
		});
	};

	const updateEdge = (index: number, field: 'from' | 'to' | 'weight', val: number) => {
		const newEdges = [...value.edges];
		newEdges[index] = {
			...newEdges[index],
			[field]: val,
		};
		validateAndChange({
			...value,
			edges: newEdges,
		});
	};

	const removeEdge = (index: number) => {
		validateAndChange({
			...value,
			edges: value.edges.filter((_, i) => i !== index),
		});
	};

	const metrics = value.metrics ?? [];
	// #, from, to, weight, one column per parameter, delete.
	const edgeColumns = `1.5rem repeat(${3 + metrics.length}, minmax(3.75rem, 1fr)) 2rem`;

	const loadExample = () => {
		setError(null);
		onChange(SAMPLE_GRAPH);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
					{t('graphPage.input.title')}
				</h2>
				<Button variant="ghost" size="sm" onClick={loadExample}>
					{t('graphPage.input.loadExample')}
				</Button>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex min-w-0 flex-col gap-1.5">
					<label className="text-xs text-foreground/50" htmlFor="graph-vertices">
						{t('graphPage.input.verticesCount')}
					</label>
					<input
						id="graph-vertices"
						type="number"
						min={1}
						value={value.vertices}
						onChange={(e) => handleVerticesChange(Number(e.target.value))}
						className={mainFieldClass}
					/>
				</div>
				<div className="flex min-w-0 flex-col gap-1.5">
					<label className="text-xs text-foreground/50" htmlFor="graph-source">
						{t('graphPage.input.sourceVertex')}
					</label>
					<input
						id="graph-source"
						type="number"
						min={1}
						max={value.vertices}
						value={value.source}
						onChange={(e) => handleSourceChange(Number(e.target.value))}
						className={mainFieldClass}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t('graphPage.input.edges')}</span>
					<Button variant="ghost" size="sm" onClick={addEdge} className="text-xs text-accent">
						{t('graphPage.input.addEdge')}
					</Button>
				</div>

				<div className="max-h-[260px] overflow-auto pr-1">
					<ul className="flex min-w-fit flex-col gap-2">
						{value.edges.map((edge, idx) => (
							<li
								key={idx}
								style={{ gridTemplateColumns: edgeColumns }}
								className="grid items-end gap-2 rounded-2xl border border-border/50 bg-muted/50 p-2"
							>
								<span className="flex h-9 items-center justify-center font-mono text-xs text-foreground/30">
									#{idx + 1}
								</span>

								<div className="flex min-w-0 flex-col gap-1">
									<span className="px-1 text-[11px] leading-none text-foreground/40">{t('graphPage.input.from')}</span>
									<input
										type="number"
										min={1}
										max={value.vertices}
										value={edge.from}
										onChange={(e) => updateEdge(idx, 'from', Number(e.target.value))}
										className={cellFieldClass}
									/>
								</div>

								<div className="flex min-w-0 flex-col gap-1">
									<span className="px-1 text-[11px] leading-none text-foreground/40">{t('graphPage.input.to')}</span>
									<input
										type="number"
										min={1}
										max={value.vertices}
										value={edge.to}
										onChange={(e) => updateEdge(idx, 'to', Number(e.target.value))}
										className={cellFieldClass}
									/>
								</div>

								<div className="flex min-w-0 flex-col gap-1">
									<span className="px-1 text-[11px] leading-none text-foreground/40">
										{t('graphPage.input.weight')}
									</span>
									<input
										type="number"
										value={edge.weight}
										onChange={(e) => updateEdge(idx, 'weight', Number(e.target.value))}
										className={cellFieldClass}
									/>
								</div>

								{metrics.map((metric) => (
									<div key={metric.key} className="flex min-w-0 flex-col gap-1">
										<span className="truncate px-1 text-[11px] leading-none text-foreground/40" title={metric.name}>
											{metric.name}
										</span>
										<input
											type="number"
											step="any"
											value={edge.values?.[metric.key] ?? ''}
											placeholder="—"
											aria-label={`${metric.name}, ${t('graphPage.input.edgeNumber', { n: idx + 1 })}`}
											onChange={(e) =>
												validateAndChange(
													setEdgeValue(
														value,
														idx,
														metric.key,
														e.target.value === '' ? null : Number(e.target.value),
													),
												)
											}
											className={cellFieldClass}
										/>
									</div>
								))}

								<button
									type="button"
									onClick={() => removeEdge(idx)}
									className="flex h-9 items-center justify-center rounded-lg text-foreground/30 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
									title={t('graphPage.input.removeEdge')}
									aria-label={t('graphPage.input.removeEdge')}
								>
									✕
								</button>
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Extra edge parameters (throughput, time…): optional, summarised per route. */}
			<div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
				<div className="flex items-center justify-between">
					<span className="text-xs uppercase tracking-[0.2em] text-foreground/40">{t('graphPage.metrics.title')}</span>
					<Button
						variant="ghost"
						size="sm"
						className="text-xs text-accent"
						disabled={metrics.length >= MAX_METRICS}
						onClick={() => onChange(addMetric(value, t('graphPage.metrics.defaultName', { n: metrics.length + 1 }), 'sum'))}
					>
						{t('graphPage.metrics.add')}
					</Button>
				</div>
				{metrics.length === 0 ? (
					<p className="text-[11px] leading-relaxed text-foreground/40">{t('graphPage.metrics.empty')}</p>
				) : (
					<ul className="flex flex-col gap-2">
						{metrics.map((metric) => (
							<li key={metric.key} className="grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-2">
								<input
									type="text"
									value={metric.name}
									maxLength={MAX_METRIC_NAME}
									aria-label={t('graphPage.metrics.name')}
									onChange={(e) => onChange(updateMetric(value, metric.key, { name: e.target.value }))}
									className={`${cellFieldClass} px-2 text-left font-sans`}
								/>
								<select
									value={metric.aggregate}
									aria-label={t('graphPage.metrics.aggregate')}
									onChange={(e) =>
										onChange(updateMetric(value, metric.key, { aggregate: e.target.value as MetricAggregate }))
									}
									className={`${cellFieldClass} w-auto px-2 font-sans`}
								>
									{METRIC_AGGREGATES.map((aggregate) => (
										<option key={aggregate} value={aggregate}>
											{t(`graphPage.metrics.aggregates.${aggregate}`)}
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={() => onChange(removeMetric(value, metric.key))}
									className="flex h-9 items-center justify-center rounded-lg text-foreground/30 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
									title={t('graphPage.metrics.remove')}
									aria-label={t('graphPage.metrics.removeNamed', { name: metric.name })}
								>
									✕
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			{error && (
				<p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-300">
					{error}
				</p>
			)}
		</div>
	);
}