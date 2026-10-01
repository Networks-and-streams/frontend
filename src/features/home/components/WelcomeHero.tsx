import { useTranslation } from 'react-i18next';
import { GraphIcon } from '@/shared/icons';

/**
 * Welcome hero: application name, a short description of what the app is for
 * and a concise welcome message. Copy comes from the i18n resources.
 */
export default function WelcomeHero() {
	const { t } = useTranslation();

	return (
		<section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 sm:p-8">
			<span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
				<GraphIcon size={14} />
				{t('home.hero.badge')}
			</span>

			<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
				{t('home.hero.title')}
			</h1>

			<p className="max-w-2xl text-sm leading-relaxed text-foreground/60">{t('home.hero.description')}</p>
			<p className="max-w-2xl text-sm leading-relaxed text-foreground/50">{t('home.hero.message')}</p>
		</section>
	);
}
