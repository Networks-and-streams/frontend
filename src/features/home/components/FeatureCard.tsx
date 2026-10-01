import type { ReactNode } from 'react';
import { ArrowRightIcon } from '@/shared/icons';

interface FeatureCardProps {
	/** Visual preview occupying the fixed-height thumbnail area. */
	preview: ReactNode;
	title: string;
	description: string;
	/** Call-to-action label shown at the bottom of the card. */
	actionLabel: string;
	onOpen: () => void;
}

/**
 * Interactive feature preview card: a fixed-height thumbnail, title,
 * description and an "open" affordance.
 *
 * Implemented as a keyboard-accessible `role="button"` container (rather than a
 * native `<button>`) so rich previews — lists, headings, the graph canvas — are
 * valid content. The previews are read-only and never capture interaction.
 */
export default function FeatureCard({ preview, title, description, actionLabel, onOpen }: FeatureCardProps) {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onOpen();
				}
			}}
			className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
		>
			<div className="relative h-44 w-full overflow-hidden border-b border-border/50 bg-muted/30">{preview}</div>

			<div className="flex flex-1 flex-col gap-1.5 p-5">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				<p className="flex-1 text-xs leading-relaxed text-foreground/50">{description}</p>
				<span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
					{actionLabel}
					<ArrowRightIcon size={14} className="transition-transform group-hover:translate-x-0.5" />
				</span>
			</div>
		</div>
	);
}
