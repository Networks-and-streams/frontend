import type { Locale } from '@/shared/i18n';

/** One numbered clause of a User Agreement. */
export interface AgreementSection {
	id: string;
	title: string;
	paragraphs: string[];
	bullets?: string[];
}

/**
 * A complete, localized User Agreement document.
 *
 * Kept as structured data (rather than JSX or a giant string) so it can be
 * rendered in the page and serialized into a downloadable document from a
 * single source of truth.
 */
export interface AgreementDocument {
	locale: Locale;
	title: string;
	versionLabel: string;
	updatedLabel: string;
	intro: string;
	sections: AgreementSection[];
	footer?: string;
}
