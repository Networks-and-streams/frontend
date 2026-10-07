import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { SpinnerIcon } from '@/shared/icons';
import { GRAPH_ALGORITHM, type GraphAlgorithm } from '../types';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';

/** Datalist suggestions are capped; any vertex number can still be typed. */
const MAX_TARGET_SUGGESTIONS = 500;

const fieldClass =
	'h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20';

/** Algorithm, target vertex, Run button and today's run allowance. */
export default function RunControls({ ws, onRan }: { ws: GraphWorkspace; onRan?: () => void }) {
	const { t } = useTranslation();
	const { graph, quota, outOfRuns, targetInvalid, target } = ws;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
				<label htmlFor="algorithm-select" className="text-xs uppercase tracking-[0.2em] text-foreground/40">
					{t('graphPage.algorithm.label')}
				</label>
				<select
					id="algorithm-select"
					value={ws.algorithm}
					onChange={(e) => ws.setAlgorithm(e.target.value as GraphAlgorithm)}
					className={fieldClass}
				>
					<option value={GRAPH_ALGORITHM.MINTY}>{t('graphPage.algorithm.minty')}</option>
					<option value={GRAPH_ALGORITHM.FORD_FULKERSON}>{t('graphPage.algorithm.fordFulkerson')}</option>
				</select>
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="target-input" className="text-xs uppercase tracking-[0.2em] text-foreground/40">
					{t('graphPage.target.label')}
				</label>
				<div className="flex gap-2">
					<input
						id="target-input"
						type="text"
						inputMode="numeric"
						autoComplete="off"
						list="target-vertices"
						value={ws.targetText}
						onChange={(e) => ws.setTargetText(e.target.value)}
						placeholder={t('graphPage.target.placeholder')}
						aria-invalid={targetInvalid}
						aria-describedby="target-help"
						className={`h-10 min-w-0 flex-1 rounded-xl border bg-muted px-3 text-sm text-foreground transition-all duration-200 placeholder:text-foreground/30 focus:outline-none focus:ring-2 ${
							targetInvalid
								? 'border-rose-500/50 focus:ring-rose-500/20'
								: 'border-border focus:border-accent/50 focus:ring-accent/20'
						}`}
					/>
					{ws.targetText !== '' && (
						<Button variant="ghost" size="sm" onClick={() => ws.setTargetText('')}>
							{t('graphPage.target.clear')}
						</Button>
					)}
				</div>
				<datalist id="target-vertices">
					{Array.from({ length: Math.min(graph.vertices, MAX_TARGET_SUGGESTIONS) }, (_, i) => (
						<option key={i + 1} value={i + 1} />
					))}
				</datalist>
				<p id="target-help" className={`text-[11px] ${targetInvalid ? 'text-rose-300' : 'text-foreground/40'}`}>
					{targetInvalid
						? t('graphPage.target.invalid', { max: graph.vertices })
						: target === null
							? t('graphPage.target.allHint')
							: t('graphPage.target.oneHint', { vertex: target })}
				</p>
			</div>

			<Button
				variant="primary"
				onClick={() => void ws.handleRun().then((ok) => ok && onRan?.())}
				disabled={!ws.canRun}
				className="w-full"
			>
				{ws.runState === 'running' ? (
					<>
						<SpinnerIcon size={16} className="animate-spin" />
						{t('graphPage.algorithm.solving')}
					</>
				) : (
					<>{t('graphPage.algorithm.run')}</>
				)}
			</Button>

			{quota && (
				<p className="text-[11px] leading-relaxed text-foreground/50">
					{quota.requiresVerification ? (
						<>
							{t('graphPage.quota.verifyFirst')}{' '}
							<Link to="/profile" className="font-medium text-accent hover:underline">
								{t('graphPage.quota.verifyLink')}
							</Link>{' '}
						</>
					) : quota.unlimited ? (
						t('graphPage.quota.unlimited')
					) : (
						t('graphPage.quota.remaining', { remaining: quota.remaining, limit: quota.limit })
					)}{' '}
					{!quota.unlimited && (
						<Link to="/subscribe" className="font-medium text-accent hover:underline">
							{outOfRuns ? t('graphPage.quota.upgradeNow') : t('graphPage.quota.upgrade')}
						</Link>
					)}
				</p>
			)}
		</div>
	);
}
