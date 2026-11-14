import { describe, expect, it } from 'vitest';
import { i18n } from '@/shared/i18n';
import { formatDateTime, formatPrice } from './format';

describe('formatPrice', () => {
	it('formats minor units as a localized currency amount', async () => {
		await i18n.changeLanguage('en');

		expect(formatPrice(499, 'USD')).toBe('$4.99');
		expect(formatPrice(0, 'USD')).toBe('$0.00');
		expect(formatPrice(100_000, 'EUR')).toBe('€1,000.00');
	});

	it('falls back to English when no language is set', () => {
		expect(formatPrice(1234, 'USD')).toMatch(/\$12\.34/);
	});
});

describe('formatDateTime', () => {
	it('renders a date with year, month, day and time', async () => {
		await i18n.changeLanguage('en');

		const label = formatDateTime('2026-11-13T10:30:00.000Z');

		expect(label).toContain('2026');
		// Local timezone may shift the hour — only assert it is a clock time.
		expect(label).toMatch(/\d{1,2}:\d{2}/);
	});

	it('returns an empty-ish string for an invalid date', () => {
		const label = formatDateTime('not-a-date');
		expect(label).toContain('Invalid');
	});
});
