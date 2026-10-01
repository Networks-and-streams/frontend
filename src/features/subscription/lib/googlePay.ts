/**
 * Minimal Google Pay JavaScript SDK wrapper.
 *
 * The SDK script is loaded at runtime from Google's CDN; no npm dependency.
 *
 * IMPORTANT — namespace: `pay.js` exposes the API at
 *   window.google.payments.api.PaymentsClient
 * (verified against the shipped script). Earlier versions of this wrapper read
 * `window.google.payments.paymentsClient`, which does not exist and made every
 * initialization attempt throw ("...is not a constructor").
 *
 * Token shape: with `tokenizationSpecification.type = 'PAYMENT_GATEWAY'` and
 * `gateway: 'stripe'`, Google Pay returns a **Stripe token** in
 * `paymentMethodData.tokenizationData.token`. That is forwarded to the backend
 * (`POST /payments/:id/google-pay`), which creates a Stripe PaymentMethod and a
 * confirmed PaymentIntent. The `stripe:publishableKey` parameter is public
 * (pk_...) and required by Stripe's gateway tokenization.
 */

declare global {
	interface Window {
		google?: {
			payments?: GooglePayPayments;
		};
	}
}

export const GOOGLE_PAY_SDK_URL = 'https://pay.google.com/gp/p/js/pay.js';
export const GOOGLE_PAY_ENV = 'TEST';
/** Stripe API version Google Pay uses for gateway tokenization (public). */
export const GOOGLE_PAY_STRIPE_API_VERSION = '2024-06-20';
export type GooglePayEnvironment = 'TEST' | 'PRODUCTION';

/** Global `window.google.payments` namespace exposed by the SDK. */
export interface GooglePayPayments {
	api: {
		PaymentsClient: new (config: GooglePayClientConfig) => GooglePayClient;
	};
}

export interface GooglePayClientConfig {
	environment: GooglePayEnvironment;
	merchantInfo?: { merchantId: string };
}

export interface GooglePayClient {
	isReadyToPay(request: GooglePayIsReadyToPayRequest): Promise<{ result: boolean }>;
	loadPaymentData(request: GooglePayPaymentDataRequest): Promise<GooglePayPaymentData>;
	createButton(options: GooglePayButtonOptions): HTMLElement;
}

export interface GooglePayButtonOptions {
	onClick: () => Promise<void> | void;
	buttonType?: 'pay' | 'buy' | 'short' | 'long' | 'donate';
	buttonColor?: 'default' | 'black' | 'white';
	buttonSizeMode?: 'fill' | 'static';
	buttonLocale?: string;
}

export interface GooglePayCardParameters {
	allowedAuthMethods: string[];
	allowedCardNetworks: string[];
	billingAddressRequired?: boolean;
}

export interface GooglePayTokenizationSpecification {
	type: 'PAYMENT_GATEWAY';
	parameters: Record<string, string>;
}

export interface GooglePayAllowedPaymentMethod {
	type: 'CARD';
	parameters: GooglePayCardParameters;
	tokenizationSpecification?: GooglePayTokenizationSpecification;
}

export interface GooglePayIsReadyToPayRequest {
	apiVersion: number;
	apiVersionMinor: number;
	allowedPaymentMethods: GooglePayAllowedPaymentMethod[];
	existingPaymentMethodRequired?: boolean;
}

export interface GooglePayPaymentDataRequest {
	apiVersion: number;
	apiVersionMinor: number;
	allowedPaymentMethods: GooglePayAllowedPaymentMethod[];
	transactionInfo: {
		totalPriceStatus: 'FINAL' | 'ESTIMATED';
		totalPrice: string;
		currencyCode: string;
	};
	merchantInfo?: { merchantId: string };
}

/**
 * Tokenization data as produced by Google Pay. For the Stripe gateway this is
 * `{ type: 'PAYMENT_GATEWAY', token: 'tok_...' | 'pm_...' }`.
 */
export interface GooglePayTokenizationData {
	type: string;
	token: string;
}

export interface GooglePayPaymentData {
	apiVersion: number;
	apiVersionMinor: number;
	paymentMethodData: {
		type: string;
		description?: string;
		info?: Record<string, unknown>;
		tokenizationData: GooglePayTokenizationData;
	};
}

export const GOOGLE_PAY_CARD_PARAMETERS: GooglePayCardParameters = {
	allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
	allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
};

/** Public Google Pay environment (TEST unless explicitly PRODUCTION). */
export function getGooglePayEnvironment(): GooglePayEnvironment {
	return import.meta.env.VITE_GOOGLE_PAY_ENV === 'PRODUCTION' ? 'PRODUCTION' : GOOGLE_PAY_ENV;
}

/** Google merchant ID. Optional in TEST, required in PRODUCTION. */
export function getGooglePayMerchantId(): string | null {
	return import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || null;
}

/**
 * Stripe publishable key (public, `pk_...`). Identifies the Stripe account to
 * Google Pay's gateway tokenization. Never a secret — the secret key stays on
 * the backend only.
 */
export function getStripePublishableKey(): string | null {
	return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || null;
}

/** Builds the (public) Stripe gateway tokenization specification. */
function buildTokenizationSpecification(): GooglePayTokenizationSpecification {
	const publishableKey = getStripePublishableKey();
	return {
		type: 'PAYMENT_GATEWAY',
		parameters: {
			gateway: 'stripe',
			'stripe:version': GOOGLE_PAY_STRIPE_API_VERSION,
			...(publishableKey ? { 'stripe:publishableKey': publishableKey } : {}),
		},
	};
}

function cardPaymentMethod(withTokenization: boolean): GooglePayAllowedPaymentMethod {
	return {
		type: 'CARD',
		parameters: GOOGLE_PAY_CARD_PARAMETERS,
		...(withTokenization ? { tokenizationSpecification: buildTokenizationSpecification() } : {}),
	};
}

export function buildIsReadyToPayRequest(): GooglePayIsReadyToPayRequest {
	return {
		apiVersion: 2,
		apiVersionMinor: 0,
		// Allow users without a saved card to add one in the sheet.
		existingPaymentMethodRequired: false,
		allowedPaymentMethods: [cardPaymentMethod(false)],
	};
}

export function buildPaymentDataRequest(
	amountCents: number,
	currency: string,
): GooglePayPaymentDataRequest {
	const merchantId = getGooglePayMerchantId();
	return {
		apiVersion: 2,
		apiVersionMinor: 0,
		allowedPaymentMethods: [cardPaymentMethod(true)],
		transactionInfo: {
			totalPriceStatus: 'FINAL',
			totalPrice: (amountCents / 100).toFixed(2),
			currencyCode: currency,
		},
		...(merchantId ? { merchantInfo: { merchantId } } : {}),
	};
}

let sdkPromise: Promise<GooglePayPayments> | null = null;

/** Loads the Google Pay JS SDK once and caches the promise. */
export function loadGooglePay(): Promise<GooglePayPayments> {
	if (!sdkPromise) {
		sdkPromise = new Promise((resolve, reject) => {
			const payments = window.google?.payments;
			if (payments?.api?.PaymentsClient) {
				resolve(payments);
				return;
			}

			const script = document.createElement('script');
			script.src = GOOGLE_PAY_SDK_URL;
			script.async = true;
			script.onload = () => {
				const loaded = window.google?.payments;
				if (loaded?.api?.PaymentsClient) {
					resolve(loaded);
				} else {
					reject(
						new Error(
							'Google Pay SDK loaded but google.payments.api.PaymentsClient is missing — ' +
								'the script namespace may have changed.',
						),
					);
				}
			};
			script.onerror = () => reject(new Error(`Failed to load the Google Pay SDK from ${GOOGLE_PAY_SDK_URL}`));
			document.head.appendChild(script);
		});
	}
	return sdkPromise;
}
