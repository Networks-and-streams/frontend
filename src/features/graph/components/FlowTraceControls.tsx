import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import Button from '@/shared/components/ui/Button/Button';
import FlowStepCard from './FlowStepCard';
import { selectStageInfo, useComputeResultStore } from '../store/computeResultStore';
import { isDetailedFlowStep, isFlowStep } from '../types';

/**
 * Trace playback controller (expansion plan §3.5).
 *
 * `⏮ ◀ ▶/⏸ ▶ ⏭` + a counter and a human readable message of the displayed
 * frame. The state lives in `computeResultStore`; this component only
 * renders it and forwards the intents.
 *
 * Two counter shapes:
 * - **flat** (Edmonds–Karp / Minty): `step N / M`, ⏮/⏭ jump to the
 *   first/last frame;
 * - **detailed** (Ford–Fulkerson): two-level `stage S / T · step K / N`,
 *   ◀/▶ step inside the current stage, ⏮/⏭ jump to the previous/next
 *   stage, plus a `FlowStepCard` with the marks, the vertex sets and the
 *   reverse chain.
 */
export default function FlowTraceControls() {
	const { t } = useTranslation();

	const steps = useComputeResultStore((s) => s.steps);
	const stepIndex = useComputeResultStore((s) => s.stepIndex);
	const isPlaying = useComputeResultStore((s) => s.isPlaying);
	const algorithm = useComputeResultStore((s) => s.algorithm);
	// `useShallow`: the selector builds a fresh object each call — without it
	// zustand 5 would re-render forever.
	const stageInfo = useComputeResultStore(useShallow(selectStageInfo));

	const firstStep = useComputeResultStore((s) => s.firstStep);
	const prevStep = useComputeResultStore((s) => s.prevStep);
	const play = useComputeResultStore((s) => s.play);
	const pause = useComputeResultStore((s) => s.pause);
	const nextStep = useComputeResultStore((s) => s.nextStep);
	const lastStep = useComputeResultStore((s) => s.lastStep);
	const prevStage = useComputeResultStore((s) => s.prevStage);
	const nextStage = useComputeResultStore((s) => s.nextStage);

	if (steps.length === 0) return null;

	const step = steps[Math.min(stepIndex, steps.length - 1)];
	const detailed = stageInfo !== null;
	const atFirst = detailed ? stageInfo.step <= 1 : stepIndex <= 0;
	const atLast = detailed ? stageInfo.step >= stageInfo.stepsInStage : stepIndex >= steps.length - 1;
	const atFirstStage = !detailed || stageInfo.stage <= 1;
	const atLastStage = !detailed || stageInfo.stage >= stageInfo.stages;

	// Human readable description of the displayed frame.
	let message = '';
	if (step && algorithm === 'minty' && 'visited' in step) {
		message = t('graphPage.trace.mintyMessage', {
			current: step.current !== null ? step.current : '—',
			visited: step.visited.length,
		});
	} else if (step && isDetailedFlowStep(step)) {
		const stage = step.stage;
		const inStage = step.stage_step;
		switch (step.kind) {
			case 'label':
				message = step.computation
					? t('graphPage.trace.labelMessage', {
							stage,
							step: inStage,
							to: step.computation.to,
							from: step.computation.from,
							markFrom: step.computation.mark_from === null ? '∞' : step.computation.mark_from,
							residual: step.computation.residual,
							markTo: step.computation.mark_to,
						})
					: t('graphPage.trace.labelStartMessage', {
							stage,
							step: inStage,
							vertex: step.marks?.[0]?.vertex ?? '—',
						});
				break;
			case 'reverse':
				message = t('graphPage.trace.reverseMessage', {
					stage,
					step: inStage,
					chain: (step.reverse_path ?? []).join('→'),
				});
				break;
			case 'augment':
				message = t('graphPage.trace.augmentMessage', {
					stage,
					step: inStage,
					path: step.augmenting_path.join('→'),
					bottleneck: step.bottleneck,
					flow: step.max_flow_so_far,
				});
				break;
			case 'final':
				message = t('graphPage.trace.finalMessage', {
					stage,
					step: inStage,
					flow: step.max_flow_so_far,
					cut: step.min_cut ? step.min_cut.value : step.max_flow_so_far,
				});
				break;
		}
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
						cut: step.min_cut ? step.min_cut.value : step.max_flow_so_far,
					});
	}

	const counter = detailed
		? t('graphPage.trace.stageStepCounter', {
				stage: stageInfo.stage,
				stages: stageInfo.stages,
				step: stageInfo.step,
				steps: stageInfo.stepsInStage,
			})
		: t('graphPage.trace.stepCounter', { current: stepIndex + 1, total: steps.length });

	return (
		<div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2.5">
			<div className="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					onClick={detailed ? prevStage : firstStep}
					disabled={detailed ? atFirstStage : atFirst}
					aria-label={t(detailed ? 'graphPage.trace.prevStage' : 'graphPage.trace.first')}
					title={t(detailed ? 'graphPage.trace.prevStage' : 'graphPage.trace.first')}
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
					onClick={detailed ? nextStage : lastStep}
					disabled={detailed ? atLastStage : atLast}
					aria-label={t(detailed ? 'graphPage.trace.nextStage' : 'graphPage.trace.last')}
					title={t(detailed ? 'graphPage.trace.nextStage' : 'graphPage.trace.last')}
				>
					⏭
				</Button>

				<span className="ml-auto font-mono text-xs text-foreground/60">{counter}</span>
			</div>

			{message ? <p className="min-h-5 text-xs text-foreground/60">{message}</p> : null}

			{detailed ? <FlowStepCard /> : null}
		</div>
	);
}
