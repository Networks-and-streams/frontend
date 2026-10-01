import { i18n } from '@/shared/i18n';

/**
 * Formats an amount in minor currency units (e.g. cents) as a readable price
 * string, localized to the active locale (falls back to 'en').
 */
export function formatPrice(amountCents: number, currency: string): string {
	return new Intl.NumberFormat(i18n.language || 'en', {
		style: 'currency',
		currency,
	}).format(amountCents / 100);
}

/** Formats an ISO date string for display, localized to the active locale. */
export function formatDateTime(dateStr: string): string {
	return new Date(dateStr).toLocaleString(i18n.language || 'en', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}