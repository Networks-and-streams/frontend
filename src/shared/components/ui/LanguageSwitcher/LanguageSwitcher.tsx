import { useTranslation } from 'react-i18next';
import { changeLocale, LOCALES, resolveLocale, type Locale } from '@/shared/i18n';

interface LanguageSwitcherProps {
	variant?: 'header' | 'page';
	className?: string;
}

const shortLabel: Record<Locale, string> = {
	en: 'EN',
	uk: 'UA',
};

const fullLabel: Record<Locale, 'en' | 'uk'> = {
	en: 'en',
	uk: 'uk',
};

/**
 * EN / UA locale toggle. Reads the current locale from i18next and persists
 * changes; re-renders automatically when the language changes (react-i18next).
 */
export default function LanguageSwitcher({ variant = 'header', className = '' }: LanguageSwitcherProps) {
	const { t, i18n } = useTranslation();
	const active = resolveLocale(i18n.language);

	const baseClasses =
		'inline-flex items-center rounded-xl border border-border bg-muted/60 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';
	const itemClasses = (isActive: boolean) =>
		`rounded-[11px] px-2.5 py-1.5 transition-colors ${
			isActive
				? 'bg-accent text-black shadow-[0_8px_20px_-10px] shadow-accent/40'
				: 'text-foreground/50 hover:text-foreground'
		}`;

	const sizeClasses = variant === 'page' ? 'px-3 py-2' : '';

	return (
		<div
			role="group"
			aria-label={t('languageSwitcher.label')}
			className={`${baseClasses} ${sizeClasses} ${className}`}
		>
			{LOCALES.map((locale) => (
				<button
					key={locale}
					type="button"
					aria-pressed={active === locale}
					title={t(`languageSwitcher.${fullLabel[locale]}`)}
					onClick={() => void changeLocale(locale)}
					className={itemClasses(active === locale)}
				>
					{shortLabel[locale]}
				</button>
			))}
		</div>
	);
}