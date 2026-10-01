import type { Locale } from '@/shared/i18n';
import { agreementEn } from './agreement.en';
import { agreementUk } from './agreement.uk';
import type { AgreementDocument } from './types';

/** All localized User Agreement documents, keyed by locale. */
export const AGREEMENTS: Record<Locale, AgreementDocument> = {
	en: agreementEn,
	uk: agreementUk,
};

/** Returns the User Agreement document for the given locale. */
export function getAgreement(locale: Locale): AgreementDocument {
	return AGREEMENTS[locale];
}
