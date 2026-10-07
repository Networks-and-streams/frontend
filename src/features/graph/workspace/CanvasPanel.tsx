import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import StepPlayer from '../components/StepPlayer';
import CanvasErrorBoundary from '../components/CanvasErrorBoundary';
import GraphTextView from '../components/GraphTextView';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';

// Cytoscape + ELK are heavy — load them only when the workspace renders.
const GraphVisualization = lazy(() => import('../components/GraphVisualization'));

/**
 * The editable graph canvas (or its text view when chosen / unsupported /
 * crashed) with the step player under it.
 */
export default function CanvasPanel({
	ws,
	heightClassName = 'h-[380px]',
}: {
	ws: GraphWorkspace;
	heightClassName?: string;
}) {
	const { t } = useTranslation();
	const { graph, frame, shownResult, canvasSupported } = ws;
	const result = frame ? null : shownResult;

	return (
		<>
			{canvasSupported && (
				<div className="mb-2 flex justify-end">
					<Button variant="ghost" size="sm" onClick={() => ws.setTextView(!ws.textView)} aria-pressed={ws.textView}>
						{ws.textView ? t('graphPage.text.showCanvas') : t('graphPage.text.showText')}
					</Button>
				</div>
			)}
			{ws.textView || !canvasSupported ? (
				<GraphTextView
					graph={graph}
					result={result}
					frame={frame}
					notice={canvasSupported ? undefined : t('graphPage.text.unsupported')}
				/>
			) : (
				<CanvasErrorBoundary
					fallback={<GraphTextView graph={graph} result={result} frame={frame} notice={t('graphPage.text.crashed')} />}
				>
					<Suspense fallback={<div className={`${heightClassName} w-full animate-pulse rounded-2xl bg-muted/40`} />}>
						<GraphVisualization
							graph={graph}
							result={result}
							frame={frame}
							onChange={ws.setGraph}
							heightClassName={heightClassName}
						/>
					</Suspense>
				</CanvasErrorBoundary>
			)}
			{ws.steps && !ws.needsRerun && (
				<div className="mt-3">
					<StepPlayer
						total={ws.steps.length}
						index={frame ? ws.stepIndex : null}
						frame={frame}
						onIndexChange={ws.setStepIndex}
					/>
				</div>
			)}
		</>
	);
}
