import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '@/shared/components/ui/SectionHeading/SectionHeading';
import { ArrowRightIcon, EyeIcon, PlayIcon, PlusIcon, SettingsIcon } from '@/shared/icons';
import { HOW_IT_WORKS_KEYS } from '../constants';

const STEP_ICONS = {
	create: PlusIcon,
	configure: SettingsIcon,
	run: PlayIcon,
	view: EyeIcon,
} as const;

/**
 * Compact visual explanation of the workflow:
 * create graph → configure algorithm → run → view solution.
 */
export default function HowItWorks() {
	const { t } = useTranslation();

	return (
		<section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
			<SectionHeading icon={<PlayIcon size={16} />} title={t('home.howItWorks.title')} />

			<ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
				{HOW_IT_WORKS_KEYS.map((key, index) => {
					const Icon = STEP_ICONS[key];
					return (
						<Fragment key={key}>
							<li className="flex flex-1 items-center gap-3 rounded-2xl border border-border/50 bg-muted/50 p-4">
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
									<Icon size={18} />
								</span>
								<span className="flex flex-col gap-0.5">
									<span className="text-[11px] font-medium uppercase tracking-[0.2em] text-foreground/30">
										{t('home.howItWorks.stepLabel', { number: index + 1 })}
									</span>
									<span className="text-sm font-medium text-foreground">
										{t(`home.howItWorks.steps.${key}`)}
									</span>
								</span>
							</li>
							{index < HOW_IT_WORKS_KEYS.length - 1 && (
								<ArrowRightIcon className="mx-auto h-4 w-4 shrink-0 rotate-90 self-center text-foreground/25 sm:mx-1 sm:rotate-0" />
							)}
						</Fragment>
					);
				})}
			</ol>
		</section>
	);
}
