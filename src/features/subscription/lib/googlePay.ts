/**
 * Minimal Google Pay JavaScript SDK wrapper.
 *
 * The SDK script is loaded at runtime from Google's CDN; no npm dependency.
 * Only the subset of the API used by this app is modeled. The token payload
 * produced here matches the backend's `ProcessGooglePayDto` contract
 * (`backend/src/payments/dto/google-pay.dto.ts`) and the Stripe gateway
 * expectations (`backend/src/payments/providers/stripe/stripe.gateway.ts`
 * — handles `tok_` and `pm_` tokens).
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
export type GooglePayEnvironment = 'TEST' | 'PRODUCTION';

export interface GooglePayPayments {
	paymentsClient: new (config: GooglePayClientConfig) => GooglePayClient;
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

/** Raw token payload sent to POST /payments/:id/google-pay. */
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

/** Tokenization spec for the Stripe gateway (matches backend PAYMENT_PROVIDER=stripe). */
export const GOOGLE_PAY_TOKENIZATION: GooglePayTokenizationSpecification = {
	type: 'PAYMENT_GATEWAY',
	parameters: {
		gateway: 'stripe',
		'stripe:version': '2024-06-20',
	},
};

export function getGooglePayEnvironment(): GooglePayEnvironment {
	return import.meta.env.VITE_GOOGLE_PAY_ENV === 'PRODUCTION' ? 'PRODUCTION' : GOOGLE_PAY_ENV;
}

export function getGooglePayMerchantId(): string | null {
	return import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || null;
}

function cardPaymentMethod(withTokenization: boolean): GooglePayAllowedPaymentMethod {
	return {
		type: 'CARD',
		parameters: GOOGLE_PAY_CARD_PARAMETERS,
		...(withTokenization ? { tokenizationSpecification: GOOGLE_PAY_TOKENIZATION } : {}),
	};
}

export function buildIsReadyToPayRequest(): GooglePayIsReadyToPayRequest {
	return {
		apiVersion: 2,
		apiVersionMinor: 0,
		existingPaymentMethodRequired: true,
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
			if (window.google?.payments) {
				resolve(window.google.payments);
				return;
			}

			const script = document.createElement('script');
			script.src = GOOGLE_PAY_SDK_URL;
			script.async = true;
			script.onload = () => {
				if (window.google?.payments) {
					resolve(window.google.payments);
				} else {
					reject(new Error('Google Pay SDK loaded but the payments namespace is missing.'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load the Google Pay SDK.'));
			document.head.appendChild(script);
		});
	}
	return sdkPromise;
}