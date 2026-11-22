import { create } from 'zustand';

/**
 * Application theme (light / dark).
 *
 * - The active theme is the `.dark` class on `<html>`; every color in
 *   `index.css` is a token that flips with it (`:root` = light, `.dark` = dark).
 * - The choice is persisted in localStorage and re-applied before the first
 *   paint by the inline script in `index.html` (same storage key) so there is
 *   no flash of the wrong theme.
 * - Dark is the default — the product's original look.
 */
export type Theme = 'light' | 'dark';

/** Keep in sync with the inline script in index.html. */
export const THEME_STORAGE_KEY = 'graph-resolver.theme';

export const DEFAULT_THEME: Theme = 'dark';

/** Narrows an arbitrary stored value to a valid theme (falls back to dark). */
export function resolveTheme(value: unknown): Theme {
	return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}

/** Reads the persisted theme; missing/blocked storage yields the default. */
export function readStoredTheme(): Theme {
	try {
		return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
	} catch {
		return DEFAULT_THEME;
	}
}

/** Materializes the theme on the document (class toggled by the inline script too). */
export function applyTheme(theme: Theme): void {
	document.documentElement.classList.toggle('dark', theme === 'dark');
}

function persistTheme(theme: Theme): void {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Private mode / blocked storage: the session still switches themes.
	}
}

interface ThemeState {
	/** Currently active theme. */
	theme: Theme;
	/** Switches to `theme`: applies it to the document and persists the choice. */
	setTheme: (theme: Theme) => void;
	/** Flips between light and dark. */
	toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
	theme: readStoredTheme(),

	setTheme: (theme) => {
		applyTheme(theme);
		persistTheme(theme);
		set({ theme });
	},

	toggleTheme: () => {
		get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
	},
}));
