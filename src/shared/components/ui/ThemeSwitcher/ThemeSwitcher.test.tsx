import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { THEME_STORAGE_KEY, useThemeStore } from '@/shared/theme/theme';
import ThemeSwitcher from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
	beforeEach(() => {
		localStorage.clear();
		useThemeStore.setState({ theme: 'dark' });
		document.documentElement.classList.add('dark');
	});

	it('renders the sun/moon pill with the active theme pressed', () => {
		render(<ThemeSwitcher />);

		const group = screen.getByRole('group', { name: 'Theme' });
		expect(group).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('switches to light: state, document class and persistence', () => {
		render(<ThemeSwitcher />);

		fireEvent.click(screen.getByRole('button', { name: 'Light theme' }));

		expect(screen.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'false');
		expect(useThemeStore.getState().theme).toBe('light');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
	});

	it('switches back to dark', () => {
		useThemeStore.setState({ theme: 'light' });
		document.documentElement.classList.remove('dark');
		render(<ThemeSwitcher />);

		fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));

		expect(useThemeStore.getState().theme).toBe('dark');
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
	});
});
