import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { DownloadIcon, FileTextIcon, PlusIcon, SaveIcon, SpinnerIcon } from '@/shared/icons';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';
import { useImportPicker } from './useImportPicker';

type SaveStatus = 'saved' | 'unsaved';

/** How long the full label stays before the badge shrinks to a dot. */
const EXPANDED_MS: Record<SaveStatus, number> = { saved: 2500, unsaved: 4000 };

// Full class names (Tailwind only generates classes it finds written out).
const TONE: Record<SaveStatus, { badge: string; revealed: string; dot: string }> = {
	saved: {
		badge: 'border-accent/30 bg-accent/10 text-accent',
		revealed:
			'text-accent hover:border-accent/30 hover:bg-accent/10 focus:border-accent/30 focus:bg-accent/10',
		dot: 'bg-accent',
	},
	// Unsaved stays a little more noticeable: amber and a soft pulse (motion permitting).
	unsaved: {
		badge: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
		revealed:
			'text-amber-300 hover:border-amber-400/30 hover:bg-amber-400/10 focus:border-amber-400/30 focus:bg-amber-400/10',
		dot: 'bg-amber-400 motion-safe:animate-pulse',
	},
};

/**
 * "Saved" / "Unsaved changes" badge for the edited graph. It shows its label
 * when the status changes, then shrinks to a coloured dot; hovering or
 * focusing it shows the label again. Screen readers always get the text.
 */
export function SaveStatusBadge({ ws }: { ws: GraphWorkspace }) {
	const { t } = useTranslation();
	const status: SaveStatus | null = ws.isDirty ? 'unsaved' : ws.graphId ? 'saved' : null;
	// The status the badge has already collapsed for; any other status shows expanded.
	const [collapsedFor, setCollapsedFor] = useState<SaveStatus | null>(null);
	const expanded = status !== collapsedFor;

	useEffect(() => {
		if (!status) return;
		const timer = window.setTimeout(() => setCollapsedFor(status), EXPANDED_MS[status]);
		return () => window.clearTimeout(timer);
	}, [status]);

	if (!status) return null;
	const label = status === 'saved' ? t('graphPage.saveCard.saved') : t('graphPage.saveCard.unsaved');
	const tone = TONE[status];

	return (
		<span
			role="status"
			tabIndex={0}
			title={label}
			className={`group inline-flex h-6 items-center rounded-full border text-[11px] font-medium transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
				expanded
					? `${tone.badge} gap-1.5 px-2.5`
					: `${tone.revealed} gap-0 border-transparent px-1.5 hover:gap-1.5 hover:px-2.5 focus:gap-1.5 focus:px-2.5`
			}`}
		>
			<span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
			<span
				className={`overflow-hidden whitespace-nowrap transition-all duration-500 ${
					expanded
						? 'max-w-40 opacity-100'
						: 'max-w-0 opacity-0 group-hover:max-w-40 group-hover:opacity-100 group-focus:max-w-40 group-focus:opacity-100'
				}`}
			>
				{label}
			</span>
		</span>
	);
}

/** Classic layout: name, save, new, import and download in one card. */
export default function SaveCard({ ws }: { ws: GraphWorkspace }) {
	const { t } = useTranslation();
	const picker = useImportPicker(ws);

	return (
		<div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
					{t('graphPage.saveCard.title')}
				</h2>
				<div className="flex items-center gap-2">
					<SaveStatusBadge ws={ws} />
					<Button variant="ghost" size="sm" onClick={ws.handleNew} title={t('graphPage.saveCard.newTitle')}>
						<PlusIcon size={14} />
						{t('graphPage.saveCard.new')}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<Button variant="secondary" size="sm" onClick={picker.open} title={t('graphPage.file.importTitle')}>
					<FileTextIcon size={14} />
					{t('graphPage.file.import')}
				</Button>
				<Button
					variant="secondary"
					size="sm"
					onClick={ws.handleDownload}
					disabled={!ws.graphValid}
					title={t('graphPage.file.downloadTitle')}
				>
					<DownloadIcon size={14} />
					{t('graphPage.file.download')}
				</Button>
				{picker.input}
			</div>

			<div className="flex flex-col gap-1.5">
				<label htmlFor="graph-name" className="text-xs text-foreground/50">
					{t('graphPage.saveCard.name')}
				</label>
				<input
					id="graph-name"
					type="text"
					value={ws.graphName}
					onChange={(e) => ws.setName(e.target.value)}
					placeholder={t('graphPage.saveCard.namePlaceholder')}
					className="h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-foreground/30 transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
				/>
			</div>

			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				<Button variant="primary" onClick={() => ws.handleSave(false)} disabled={!ws.canSave} className="w-full">
					{ws.saving ? (
						<>
							<SpinnerIcon size={15} className="animate-spin" />
							{t('graphPage.saveCard.saving')}
						</>
					) : (
						<>
							<SaveIcon size={15} />
							{ws.graphId ? t('graphPage.saveCard.saveChanges') : t('graphPage.saveCard.save')}
						</>
					)}
				</Button>
				<Button
					variant="secondary"
					onClick={() => ws.handleSave(true)}
					disabled={!ws.canSave}
					title={t('graphPage.saveCard.saveAsNewTitle')}
					className="w-full"
				>
					{t('graphPage.saveCard.saveAsNew')}
				</Button>
			</div>

			<p className="text-[11px] leading-relaxed text-foreground/40">
				{ws.graphId ? t('graphPage.saveCard.hasChangesInfo') : t('graphPage.saveCard.newGraphInfo')}
			</p>
		</div>
	);
}
