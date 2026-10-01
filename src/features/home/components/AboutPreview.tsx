import { useTranslation } from 'react-i18next';
import { FileTextIcon, InfoIcon, UsersIcon } from '@/shared/icons';

/** Mini rows representing the main content of the About page. */
const ROWS = [
	{ key: 'info', icon: InfoIcon },
	{ key: 'team', icon: UsersIcon },
	{ key: 'docs', icon: FileTextIcon },
] as const;

/** Static, read-only preview of the About page for its feature card. */
export default function AboutPreview() {
	const { t } = useTranslation();

	return (
		<ul className="flex h-full flex-col justify-center gap-2 p-3">
			{ROWS.map(({ key, icon: Icon }) => (
				<li
					key={key}
					className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/60 px-3 py-2"
				>
					<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
						<Icon size={14} />
					</span>
					<span className="truncate text-xs font-medium text-foreground/70">
						{t(`home.previews.about.items.${key}`)}
					</span>
				</li>
			))}
		</ul>
	);
}
