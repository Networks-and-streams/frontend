import { beforeEach, describe, expect, it } from 'vitest';
import {
	applyTheme,
	DEFAULT_THEME,
	readStoredTheme,
	resolveTheme,
	THEME_STORAGE_KEY,
	useThemeStore,
} from './theme';

describe('resolveTheme', () => {
	it('accepts the two valid themes', () => {
		expect(resolveTheme('light')).toBe('light');
		expect(resolveTheme('dark')).toBe('dark');
	});

	it('falls back to the default for anything else', () => {
		expect(resolveTheme('auto')).toBe(DEFAULT_THEME);
		expect(resolveTheme('')).toBe(DEFAULT_THEME);
		expect(resolveTheme(null)).toBe(DEFAULT_THEME);
		expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
		expect(resolveTheme(42)).toBe(DEFAULT_THEME);
	});
});

describe('readStoredTheme', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('defaults to dark when nothing is stored', () => {
		expect(readStoredTheme()).toBe('dark');
	});

	it('reads a stored value', () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'light');
		expect(readStoredTheme()).toBe('light');
	});

	it('ignores an invalid stored value', () => {
		localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
		expect(readStoredTheme()).toBe('dark');
	});
});

describe('applyTheme', () => {
	beforeEach(() => {
		document.documentElement.classList.remove('dark');
	});

	it('removes the .dark class for the light theme', () => {
		applyTheme('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('adds the .dark class for the dark theme', () => {
		applyTheme('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});
});

describe('useThemeStore', () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove('dark');
		useThemeStore.setState({ theme: 'dark' });
	});

	it('setTheme applies the class, persists the choice and updates state', () => {
		useThemeStore.getState().setTheme('light');

		expect(useThemeStore.getState().theme).toBe('light');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('toggleTheme flips between the themes', () => {
		useThemeStore.getState().toggleTheme();
		expect(useThemeStore.getState().theme).toBe('light');

		useThemeStore.getState().toggleTheme();
		expect(useThemeStore.getState().theme).toBe('dark');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});
});
