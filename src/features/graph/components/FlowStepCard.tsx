import { useTranslation } from 'react-i18next';
import { useComputeResultStore } from '../store/computeResultStore';
import { isDetailedFlowStep, type VertexMark } from '../types';

/**
 * Detailed step card of the Ford–Fulkerson trace (expansion plan §3.5).
 *
 * Rendered under the player for every detailed frame: what the step shows
 * (labeling / reverse chain / augmentation / final check), the labeling
 * computation, all marks (мітки), the labeled/unlabeled vertex sets and the
 * reverse chain (зворотній ланцюг) grown so far. Edmonds–Karp frames stay
 * flat and render no card.
 */

const KIND_KEYS = {
	label: 'graphPage.trace.kindLabel',
	reverse: 'graphPage.trace.kindReverse',
	augment: 'graphPage.trace.kindAugment',
	final: 'graphPage.trace.kindFinal',
} as const;

/** `∞` for the source's mark, the plain number otherwise. */
function formatMark(mark: number | null): string {
	return mark === null ? '∞' : String(mark);
}

function VertexChips({ vertices, muted = false }: { vertices: number[]; muted?: boolean }) {
	if (vertices.length === 0) {
		return <span className="font-mono text-[11px] text-foreground/40">∅</span>;
	}
	return (
		<>
			{vertices.map((vertex) => (
				<span
					key={vertex}
					className={`rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] ${
						muted ? 'text-foreground/50' : 'text-foreground'
					}`}
				>
					{vertex}
				</span>
			))}
		</>
	);
}

export default function FlowStepCard() {
	const { t } = useTranslation();
	const step = useComputeResultStore((s) => s.steps[s.stepIndex]);

	if (!isDetailedFlowStep(step)) return null;

	const marks: VertexMark[] = step.marks ?? [];
	const computation = step.computation;
	const chain = step.reverse_path ?? [];

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-3.5 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
					{t(KIND_KEYS[step.kind])}
				</span>
				{computation ? (
					<span className="font-mono text-[11px] text-foreground/70">
						min({formatMark(computation.mark_from)}, {computation.residual}) = {computation.mark_to}
						{computation.backward ? ` · ${t('graphPage.trace.backwardArc')}` : ''}
					</span>
				) : null}
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] uppercase tracking-wider text-foreground/40">
						{t('graphPage.trace.marksTitle')}
					</span>
					<div className="flex flex-wrap gap-1">
						{marks.map((mark) => (
							<span
								key={mark.vertex}
								className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
							>
								{mark.vertex}: {formatMark(mark.mark)}
							</span>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] uppercase tracking-wider text-foreground/40">
						{t('graphPage.trace.labeledTitle')}
					</span>
					<div className="flex flex-wrap gap-1">
						<VertexChips vertices={step.labeled ?? []} />
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] uppercase tracking-wider text-foreground/40">
						{t('graphPage.trace.unlabeledTitle')}
					</span>
					<div className="flex flex-wrap gap-1">
						<VertexChips vertices={step.unlabeled ?? []} muted />
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-[11px] uppercase tracking-wider text-foreground/40">
					{t('graphPage.trace.reverseTitle')}
				</span>
				{chain.length > 0 ? (
					<span className="font-mono text-[11px] text-foreground/80">{chain.join(' → ')}</span>
				) : (
					<span className="text-[11px] text-foreground/40">{t('graphPage.trace.reverseEmpty')}</span>
				)}
			</div>
		</div>
	);
}
