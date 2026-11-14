import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { useComputeResultStore } from '../store/computeResultStore';
import { isFlowResult, isFlowStep } from '../types';

/**
 * Trace playback controller (expansion plan §3.5).
 *
 * `⏮ ◀ ▶/⏸ ▶ ⏭` + a `step N / M` counter and a human readable message of
 * the displayed frame. The state lives in `computeResultStore`; this component
 * only renders it and forwards the intents.
 */
export default function FlowTraceControls() {
	const { t } = useTranslation();

	const steps = useComputeResultStore((s) => s.steps);
	const stepIndex = useComputeResultStore((s) => s.stepIndex);
	const isPlaying = useComputeResultStore((s) => s.isPlaying);
	const algorithm = useComputeResultStore((s) => s.algorithm);
	const result = useComputeResultStore((s) => s.result);

	const firstStep = useComputeResultStore((s) => s.firstStep);
	const prevStep = useComputeResultStore((s) => s.prevStep);
	const play = useComputeResultStore((s) => s.play);
	const pause = useComputeResultStore((s) => s.pause);
	const nextStep = useComputeResultStore((s) => s.nextStep);
	const lastStep = useComputeResultStore((s) => s.lastStep);

	if (steps.length === 0) return null;

	const step = steps[Math.min(stepIndex, steps.length - 1)];
	const atFirst = stepIndex <= 0;
	const atLast = stepIndex >= steps.length - 1;

	// Human readable description of the displayed frame.
	let message = '';
	if (step && algorithm === 'minty' && 'visited' in step) {
		message = t('graphPage.trace.mintyMessage', {
			current: step.current !== null ? step.current : '—',
			visited: step.visited.length,
		});
	} else if (step && isFlowStep(step)) {
		message =
			step.augmenting_path.length >= 2
				? t('graphPage.trace.flowMessage', {
						iteration: step.iteration,
						path: step.augmenting_path.join('→'),
						bottleneck: step.bottleneck,
						flow: step.max_flow_so_far,
					})
				: t('graphPage.trace.flowFinalMessage', {
						iteration: step.iteration,
						flow: step.max_flow_so_far,
						cut: result && isFlowResult(result) ? result.min_cut.value : step.max_flow_so_far,
					});
	}

	return (
		<div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2.5">
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					onClick={firstStep}
					disabled={atFirst}
					aria-label={t('graphPage.trace.first')}
					title={t('graphPage.trace.first')}
				>
					⏮
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={prevStep}
					disabled={atFirst}
					aria-label={t('graphPage.trace.prev')}
					title={t('graphPage.trace.prev')}
				>
					◀
				</Button>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => (isPlaying ? pause() : play())}
					aria-label={isPlaying ? t('graphPage.trace.pause') : t('graphPage.trace.play')}
					title={isPlaying ? t('graphPage.trace.pause') : t('graphPage.trace.play')}
					className="min-w-24"
				>
					{isPlaying ? '⏸' : '▶'}
					{isPlaying ? t('graphPage.trace.pause') : t('graphPage.trace.play')}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={nextStep}
					disabled={atLast}
					aria-label={t('graphPage.trace.next')}
					title={t('graphPage.trace.next')}
				>
					▶
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={lastStep}
					disabled={atLast}
					aria-label={t('graphPage.trace.last')}
					title={t('graphPage.trace.last')}
				>
					⏭
				</Button>

				<span className="ml-auto font-mono text-xs text-foreground/60">
					{t('graphPage.trace.stepCounter', { current: stepIndex + 1, total: steps.length })}
				</span>
			</div>

			{message ? <p className="min-h-5 text-xs text-foreground/60">{message}</p> : null}
		</div>
	);
}
