import { useTranslation } from 'react-i18next';
import { MoonIcon, SunIcon } from '@/shared/icons';
import { useThemeStore, type Theme } from '@/shared/theme/theme';

interface ThemeSwitcherProps {
	variant?: 'header' | 'page';
	className?: string;
}

/** Visual order of the pill: sun (light) first, moon (dark) second. */
const THEMES: readonly Theme[] = ['light', 'dark'];

/**
 * Light / dark theme pill (sun + moon). Reads the active theme from the
 * theme store and re-renders on change; the store applies the `.dark` class
 * to <html> and persists the choice (see `shared/theme/theme.ts`).
 *
 * Mirrors LanguageSwitcher: `role="group"` with `aria-pressed` per item.
 */
export default function ThemeSwitcher({ variant = 'header', className = '' }: ThemeSwitcherProps) {
	const { t } = useTranslation();
	const theme = useThemeStore((s) => s.theme);
	const setTheme = useThemeStore((s) => s.setTheme);

	const baseClasses =
		'inline-flex items-center rounded-xl border border-border bg-muted/60 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30';
	const itemClasses = (isActive: boolean) =>
		`inline-flex items-center rounded-[11px] px-2.5 py-1.5 transition-colors ${
			isActive
				? 'bg-accent text-black shadow-[0_8px_20px_-10px] shadow-accent/40'
				: 'text-foreground/50 hover:text-foreground'
		}`;

	const sizeClasses = variant === 'page' ? 'px-3 py-2' : '';

	return (
		<div
			role="group"
			aria-label={t('themeSwitcher.label')}
			className={`${baseClasses} ${sizeClasses} ${className}`}
		>
			{THEMES.map((item) => (
				<button
					key={item}
					type="button"
					aria-pressed={theme === item}
					title={t(`themeSwitcher.${item}`)}
					aria-label={t(`themeSwitcher.${item}`)}
					onClick={() => setTheme(item)}
					className={itemClasses(theme === item)}
				>
					{item === 'light' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
				</button>
			))}
		</div>
	);
}
