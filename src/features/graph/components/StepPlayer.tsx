import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import type { StepFrame } from '../lib/stepTrace';

const SPEEDS_MS = { slow: 1600, normal: 900, fast: 400 } as const;
type Speed = keyof typeof SPEEDS_MS;

interface StepPlayerProps {
	total: number;
	/** Shown step, or null for the final result. */
	index: number | null;
	frame: StepFrame | null;
	onIndexChange: (index: number | null) => void;
}

/**
 * Playback controls for the algorithm's execution steps. Playing advances one
 * step per tick and ends on the final result. Every frame is also described in
 * text (announced politely) so the walkthrough works without the canvas.
 */
export default function StepPlayer({ total, index, frame, onIndexChange }: StepPlayerProps) {
	const { t } = useTranslation();
	const [playing, setPlaying] = useState(false);
	const [speed, setSpeed] = useState<Speed>('normal');

	useEffect(() => {
		if (!playing) return;
		const timer = window.setTimeout(() => {
			if (index === null) onIndexChange(0);
			else if (index + 1 < total) onIndexChange(index + 1);
			else {
				onIndexChange(null);
				setPlaying(false);
			}
		}, SPEEDS_MS[speed]);
		return () => window.clearTimeout(timer);
	}, [playing, index, total, speed, onIndexChange]);

	const goTo = (next: number | null) => {
		setPlaying(false);
		onIndexChange(next);
	};

	const togglePlay = () => {
		// Playing from the final result restarts from the first step.
		if (!playing && index === null) onIndexChange(0);
		setPlaying(!playing);
	};

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-3">
			<div className="flex flex-wrap items-center gap-2">
				<h3 className="mr-auto text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
					{t('graphPage.steps.title')}
				</h3>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => goTo(index === null ? total - 1 : Math.max(0, index - 1))}
					disabled={index === 0}
					aria-label={t('graphPage.steps.prev')}
				>
					◀
				</Button>
				<Button variant="primary" size="sm" onClick={togglePlay} className="min-w-20">
					{playing ? t('graphPage.steps.pause') : t('graphPage.steps.play')}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => goTo(index === null ? null : index + 1 < total ? index + 1 : null)}
					disabled={index === null}
					aria-label={t('graphPage.steps.next')}
				>
					▶
				</Button>
				<Button variant="ghost" size="sm" onClick={() => goTo(null)} disabled={index === null}>
					{t('graphPage.steps.showResult')}
				</Button>
				<label className="sr-only" htmlFor="step-speed">
					{t('graphPage.steps.speed')}
				</label>
				<select
					id="step-speed"
					value={speed}
					onChange={(e) => setSpeed(e.target.value as Speed)}
					className="h-8 rounded-lg border border-border bg-muted px-2 text-xs text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
				>
					<option value="slow">{t('graphPage.steps.speedSlow')}</option>
					<option value="normal">{t('graphPage.steps.speedNormal')}</option>
					<option value="fast">{t('graphPage.steps.speedFast')}</option>
				</select>
			</div>

			<div className="flex items-center gap-3">
				<label className="sr-only" htmlFor="step-slider">
					{t('graphPage.steps.slider')}
				</label>
				<input
					id="step-slider"
					type="range"
					min={0}
					max={total}
					value={index ?? total}
					onChange={(e) => {
						const value = Number(e.target.value);
						goTo(value >= total ? null : value);
					}}
					className="min-w-0 flex-1 accent-[var(--accent)]"
				/>
				<span className="shrink-0 font-mono text-[11px] text-foreground/50">
					{index === null
						? t('graphPage.steps.result')
						: t('graphPage.steps.stepOf', { step: index + 1, total })}
				</span>
			</div>

			<p aria-live="polite" className="min-h-[2.5rem] text-xs leading-relaxed text-foreground/80">
				{frame ? <FrameCaption frame={frame} /> : t('graphPage.steps.resultCaption')}
			</p>

			{frame && (
				<ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground/50">
					<LegendItem className="bg-accent" label={t('graphPage.steps.legendCurrent')} />
					<LegendItem className="border-2 border-accent-darker bg-accent/35" label={t('graphPage.steps.legendFinal')} />
					<LegendItem className="border-2 border-dashed border-accent" label={t('graphPage.steps.legendFrontier')} />
					<LegendItem className="border-[3px] border-amber-500" label={t('graphPage.steps.legendImproved')} />
				</ul>
			)}
		</div>
	);
}

function FrameCaption({ frame }: { frame: StepFrame }) {
	const { t } = useTranslation();
	if (frame.current === null) return <>{t('graphPage.steps.captionDone')}</>;

	const changes = frame.improved
		.filter((change) => change.vertex !== frame.current)
		.map((change) => `${change.vertex}: ${change.from ?? '∞'} → ${change.to}`);

	return (
		<>
			{t('graphPage.steps.captionCurrent', {
				step: frame.index + 1,
				vertex: frame.current,
				distance: frame.distances.get(frame.current) ?? '∞',
			})}{' '}
			{changes.length > 0
				? t('graphPage.steps.captionImproved', { list: changes.join(', ') })
				: t('graphPage.steps.captionNone')}
		</>
	);
}

function LegendItem({ className, label }: { className: string; label: string }) {
	return (
		<li className="flex items-center gap-1.5">
			<span aria-hidden className={`inline-block h-3 w-3 rounded-full ${className}`} />
			{label}
		</li>
	);
}
