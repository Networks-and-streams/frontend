import { useTranslation } from 'react-i18next';
import { resultEdgeIndices } from '../lib/graphElements';
import { formatMetricValue } from '../lib/edgeMetrics';
import type { StepFrame } from '../lib/stepTrace';
import type { ComputeResult, GraphInput } from '../types';

interface GraphTextViewProps {
	graph: GraphInput;
	result?: ComputeResult | null;
	frame?: StepFrame | null;
	/** Why the text view is shown instead of the canvas, if it was not chosen. */
	notice?: string;
}

/**
 * The graph as lists: vertices (source, distances during step playback) and
 * edges (marked when on a computed route). Used when the canvas cannot run
 * and as an accessible alternative to it.
 */
export default function GraphTextView({ graph, result = null, frame = null, notice }: GraphTextViewProps) {
	const { t } = useTranslation();
	const onRoute = resultEdgeIndices(graph, result);
	const vertices = Array.from({ length: graph.vertices }, (_, i) => i + 1);

	const vertexState = (vertex: number): string | null => {
		if (!frame) return null;
		if (vertex === frame.current) return t('graphPage.text.stateCurrent');
		if (frame.visited.has(vertex)) return t('graphPage.text.stateFinal');
		if (frame.frontier.has(vertex)) return t('graphPage.text.stateFrontier');
		return null;
	};

	return (
		<div className="flex max-h-[420px] flex-col gap-4 overflow-auto text-sm">
			{notice && (
				<p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
					{notice}
				</p>
			)}
			<div className="grid gap-4 sm:grid-cols-2">
				<section aria-labelledby="text-vertices">
					<h3 id="text-vertices" className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/40">
						{t('graphPage.text.vertices', { count: graph.vertices })}
					</h3>
					<ul className="flex flex-col gap-1 font-mono text-xs">
						{vertices.map((vertex) => {
							const state = vertexState(vertex);
							const distance = frame?.distances.get(vertex);
							return (
								<li
									key={vertex}
									className={`flex justify-between rounded-lg border px-2.5 py-1.5 ${
										vertex === frame?.current ? 'border-accent bg-accent/10' : 'border-border/50 bg-muted/50'
									}`}
								>
									<span>
										{vertex}
										{vertex === graph.source && (
											<span className="ml-2 text-accent">({t('graphPage.canvas.source')})</span>
										)}
									</span>
									{frame && (
										<span className="text-foreground/60">
											{distance ?? '∞'}
											{state && ` · ${state}`}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				</section>
				<section aria-labelledby="text-edges">
					<h3 id="text-edges" className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/40">
						{t('graphPage.text.edges', { count: graph.edges.length })}
					</h3>
					{graph.edges.length === 0 ? (
						<p className="text-xs text-foreground/40">{t('graphPage.text.noEdges')}</p>
					) : (
						<ul className="flex flex-col gap-1 font-mono text-xs">
							{graph.edges.map((edge, index) => (
								<li
									key={index}
									className={`flex justify-between rounded-lg border px-2.5 py-1.5 ${
										onRoute.has(index) || frame?.relaxedEdges.has(index)
											? 'border-accent/50 bg-accent/10 text-accent'
											: 'border-border/50 bg-muted/50'
									}`}
								>
									<span>
										{edge.from} → {edge.to}
									</span>
									<span>
										{t('graphPage.input.weight')}: {edge.weight}
										{(graph.metrics ?? []).map((m) =>
											edge.values?.[m.key] !== undefined ? ` · ${m.name}: ${formatMetricValue(edge.values[m.key])}` : '',
										)}
										{onRoute.has(index) && ` · ${t('graphPage.text.onRoute')}`}
									</span>
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</div>
	);
}
