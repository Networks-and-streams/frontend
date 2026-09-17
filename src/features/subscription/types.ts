/**
 * DTO-aligned types for the subscription/payment API.
 *
 * Backend reference:
 * - `backend/src/subscriptions/`  -> GET /subscriptions/me
 * - `backend/src/payments/`       -> POST /payments, POST /payments/:id/google-pay, GET /payments/:id
 */

export const SUBSCRIPTION_STATUS = {
	INACTIVE: 'INACTIVE',
	ACTIVE: 'ACTIVE',
	PAST_DUE: 'PAST_DUE',
	CANCELLED: 'CANCELLED',
	EXPIRED: 'EXPIRED',
} as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const SUBSCRIPTION_PLAN = {
	FREE: 'FREE',
	PREMIUM: 'PREMIUM',
} as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

export const PAYMENT_STATUS = {
	PENDING: 'PENDING',
	PROCESSING: 'PROCESSING',
	SUCCEEDED: 'SUCCEEDED',
	FAILED: 'FAILED',
	CANCELLED: 'CANCELLED',
	REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_METHOD = {
	CARD: 'CARD',
	GOOGLE_PAY: 'GOOGLE_PAY',
	APPLE_PAY: 'APPLE_PAY',
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/** Full record returned by GET /subscriptions/me. */
export interface Subscription {
	id: string;
	userId: string;
	status: SubscriptionStatus;
	plan: SubscriptionPlan;
	startedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
	updatedAt: string;
}

/**
 * Full payment record returned by POST /payments, GET /payments/:id and
 * POST /payments/:id/google-pay.
 */
export interface Payment {
	id: string;
	userId: string;
	subscriptionId: string;
	provider: string;
	paymentMethod: PaymentMethod;
	status: PaymentStatus;
	plan: SubscriptionPlan;
	amount: number;
	currency: string;
	providerPaymentId: string | null;
	providerMetadata: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

/** Body for POST /payments. */
export interface CreatePaymentDto {
	plan: SubscriptionPlan;
	paymentMethod: PaymentMethod;
}

/** Body for POST /payments/:id/google-pay (raw Google Pay tokenization data). */
export interface GooglePayTokenData {
	type: string;
	token: string;
}

export interface ProcessGooglePayDto {
	tokenData: GooglePayTokenData;
}

/**
 * Pricing/plan configuration displayed in the UI.
 *
 * The backend does not expose a pricing endpoint today; these values mirror
 * the server-side constants (`PLAN_PRICING = { PREMIUM: 999 }`,
 * `PAYMENT_CURRENCY = USD`, `SUBSCRIPTION_DURATION_MS`) in
 * `backend/src/payments/` and `backend/src/subscriptions/`.
 * Amounts are in minor currency units (cents).
 */
export const PREMIUM_PLAN_CONFIG = {
	plan: SUBSCRIPTION_PLAN.PREMIUM,
	amountCents: 999,
	currency: 'USD',
	durationDays: 30,
} as const;

export function isActiveSubscription(subscription: Subscription | null): boolean {
	if (!subscription) return false;
	if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) return false;
	if (!subscription.expiresAt) return false;
	return new Date(subscription.expiresAt).getTime() > Date.now();
}

/** Payment statuses that never transition any further on their own. */
export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
	return (
		status === PAYMENT_STATUS.SUCCEEDED ||
		status === PAYMENT_STATUS.FAILED ||
		status === PAYMENT_STATUS.CANCELLED ||
		status === PAYMENT_STATUS.REFUNDED
	);
}