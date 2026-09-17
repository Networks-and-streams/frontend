/** Formats an amount in minor currency units (e.g. cents) as a readable price string. */
export function formatPrice(amountCents: number, currency: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(amountCents / 100);
}

/** Formats an ISO date string for display. */
export function formatDateTime(dateStr: string): string {
	return new Date(dateStr).toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}