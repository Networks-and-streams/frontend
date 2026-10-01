import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FolderIcon, InfoIcon, PlayIcon, PlusIcon } from '@/shared/icons';
import { useGraphEditorStore } from '@/features/graph/store/graphEditorStore';

/**
 * Prominent shortcuts to the application's main destinations. Each action links
 * to an existing route — no duplicate functionality is introduced.
 *
 * "Create graph" resets the shared graph editor to a fresh graph before opening
 * the workspace, mirroring the editor's own "New" action.
 */
export default function QuickActions() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const createGraph = () => {
		useGraphEditorStore.getState().startNew();
		navigate('/graph');
	};

	const actions = [
		{ key: 'create', icon: PlusIcon, onClick: createGraph },
		{ key: 'saved', icon: FolderIcon, onClick: () => navigate('/graph') },
		{ key: 'solve', icon: PlayIcon, onClick: () => navigate('/graph') },
		{ key: 'about', icon: InfoIcon, onClick: () => navigate('/about') },
	] as const;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
				{t('home.quickActions.title')}
			</h2>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{actions.map(({ key, icon: Icon, onClick }) => (
					<button
						key={key}
						type="button"
						onClick={onClick}
						className="group flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
					>
						<span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-muted text-accent transition-colors group-hover:border-accent/30">
							<Icon size={18} />
						</span>
						<span className="flex flex-col gap-1">
							<span className="text-sm font-semibold text-foreground">
								{t(`home.quickActions.${key}.title`)}
							</span>
							<span className="text-xs leading-relaxed text-foreground/50">
								{t(`home.quickActions.${key}.description`)}
							</span>
						</span>
					</button>
				))}
			</div>
		</section>
	);
}
