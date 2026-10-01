import type { Locale } from '@/shared/i18n';
import { getAgreement } from './agreements';
import type { AgreementDocument } from './types';

/**
 * Serializes an {@link AgreementDocument} into a plain-text document.
 *
 * Exposed separately from the download helper so the text representation can
 * be unit-tested or reused (e.g. copied to the clipboard) without touching the
 * DOM.
 */
export function buildAgreementText(doc: AgreementDocument): string {
	const lines: string[] = [doc.title, `${doc.versionLabel} · ${doc.updatedLabel}`, '', doc.intro];

	doc.sections.forEach((section, index) => {
		lines.push('', `${index + 1}. ${section.title}`, '');
		section.paragraphs.forEach((paragraph) => lines.push(paragraph, ''));
		section.bullets?.forEach((bullet) => lines.push(`• ${bullet}`));
	});

	if (doc.footer) {
		lines.push('', doc.footer);
	}

	return `${lines.join('\n').trim()}\n`;
}

/**
 * Triggers a client-side download of the User Agreement for `locale` as a
 * UTF-8 text document.
 *
 * A BOM is prepended so that editors (including Windows Notepad) detect UTF-8
 * and render Ukrainian characters correctly. Uses only platform APIs — no
 * additional dependencies.
 */
export function downloadAgreement(locale: Locale): void {
	const doc = getAgreement(locale);
	const blob = new Blob(['\uFEFF', buildAgreementText(doc)], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = `graph-resolver-user-agreement.${locale}.txt`;
	document.body.appendChild(link);
	link.click();
	link.remove();

	URL.revokeObjectURL(url);
}
