import { useTranslation } from 'react-i18next';
import { GraphIcon, SpinnerIcon } from '@/shared/icons';
import { formatDateTime } from '@/shared/utils';
import { useSavedGraphsStore } from '@/features/graph/store/savedGraphsStore';

/** Localized "Updated …" label, tolerating missing/invalid timestamps. */
function updatedLabel(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '' : formatDateTime(value);
}

/**
 * Read-only preview of the user's saved graphs for the "Saved graphs" feature
 * card. Reuses the existing saved-graphs store; it only reads data and never
 * mutates it. Shows a compact list when graphs exist, otherwise a clean empty
 * state.
 */
export default function SavedGraphsPreview() {
	const { t } = useTranslation();
	const graphs = useSavedGraphsStore((s) => s.graphs);
	const isLoading = useSavedGraphsStore((s) => s.isLoading);

	const preview = graphs.slice(0, 3);

	if (isLoading && graphs.length === 0) {
		return (
			<div className="flex h-full items-center justify-center gap-2 text-foreground/40">
				<SpinnerIcon size={16} className="animate-spin" />
				<span className="text-xs">{t('home.previews.saved.loading')}</span>
			</div>
		);
	}

	if (graphs.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center">
				<span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted text-foreground/40">
					<GraphIcon size={18} />
				</span>
				<span className="text-xs font-medium text-foreground/60">{t('home.previews.saved.empty')}</span>
				<span className="text-[11px] leading-relaxed text-foreground/40">
					{t('home.previews.saved.emptyHint')}
				</span>
			</div>
		);
	}

	return (
		<ul className="flex h-full flex-col justify-center gap-2 p-3">
			{preview.map((graph) => {
				const updated = updatedLabel(graph.updatedAt);
				return (
					<li
						key={graph.id}
						className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/60 px-3 py-2"
					>
						<GraphIcon size={14} className="shrink-0 text-accent" />
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-xs font-medium text-foreground">{graph.name}</span>
							{updated && (
								<span className="truncate text-[10px] text-foreground/40">
									{t('home.recent.updated', { date: updated })}
								</span>
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
