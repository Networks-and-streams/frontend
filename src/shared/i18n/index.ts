import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './resources/en';
import { uk } from './resources/uk';

/**
 * Locale handling.
 *
 * - Exactly two locales: `en` (default/fallback) and `uk`.
 * - On the first visit the browser language is adopted only when it's
 *   Ukrainian; everything else defaults to English.
 * - The user's choice is persisted in `localStorage` and restored on reload.
 *
 * Resources are inlined (no backend calls / code splitting needed for two
 * static locales), so initialization is synchronous via `initAsync: false`
 * — `i18n.language` and `t()` are usable immediately after module load.
 */

export const LOCALES = ['en', 'uk'] as const;
export type Locale = (typeof LOCALES)[number];

const STORAGE_KEY = 'graph-resolver.locale';

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

function readStoredLocale(): Locale | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return isLocale(raw) ? raw : null;
	} catch {
		return null;
	}
}

/** Resolves the active locale from an arbitrary i18next language string. */
export function resolveLocale(language: string): Locale {
	return language.toLowerCase().startsWith('uk') ? 'uk' : 'en';
}

function detectInitialLocale(): Locale {
	const stored = readStoredLocale();
	if (stored) return stored;
	// First visit only: prefer Ukrainian exactly when the browser asks for it.
	const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : 'en';
	return resolveLocale(browserLanguage);
}

/** Switches the app language. The choice is persisted on `languageChanged`. */
export function changeLocale(locale: Locale): Promise<void> {
	return i18n.changeLanguage(locale).then(() => undefined);
}

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		uk: { translation: uk },
	},
	lng: detectInitialLocale(),
	fallbackLng: 'en',
	supportedLngs: [...LOCALES],
	nonExplicitSupportedLngs: false,
	interpolation: {
		// React already escapes rendered values; prevents double escaping.
		escapeValue: false,
	},
	initAsync: false,
});

i18n.on('languageChanged', (language: string) => {
	try {
		if (isLocale(language)) {
			window.localStorage.setItem(STORAGE_KEY, language);
		} else {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		// Storage unavailable (e.g. private mode) — the in-memory locale is kept.
	}

	if (typeof document !== 'undefined') {
		document.documentElement.lang = isLocale(language) ? language : 'en';
	}
});

export { i18n };

// ---------------------------------------------------------------------------
// Strict i18next typing: `t()` keys are validated against the English resource
// tree at compile time (wrong/missing keys are TypeScript errors). `uk` is
// statically guaranteed to have the same shape (see resources/uk.ts).
// ---------------------------------------------------------------------------
declare module 'i18next' {
	interface CustomTypeOptions {
		defaultNS: 'translation';
		resources: {
			translation: typeof en;
		};
	}
}