import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { AlertIcon } from '@/shared/icons';
import { resolveLocale } from '@/shared/i18n';
import {
	buildIsReadyToPayRequest,
	buildPaymentDataRequest,
	getGooglePayEnvironment,
	getGooglePayMerchantId,
	getStripePublishableKey,
	loadGooglePay,
	type GooglePayClient,
	type GooglePayPaymentData,
	type GooglePayTokenizationData,
} from '../lib/googlePay';

export type GooglePayButtonState = 'loading' | 'ready' | 'unavailable' | 'error';

interface GooglePayButtonProps {
	priceCents: number;
	currency: string;
	disabled?: boolean;
	/**
	 * Called with the raw tokenization data produced by Google Pay after the
	 * user completes the payment sheet. The parent submits it to
	 * POST /payments/:id/google-pay. May be async — the button remains
	 * disabled until the promise settles.
	 */
	onToken: (token: GooglePayTokenizationData) => void | Promise<void>;
	onStateChange?: (state: GooglePayButtonState) => void;
}

/** Extracts a human-readable message from an unknown thrown value. */
function toErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

/** Google Pay rejects with `{ statusCode: 'CANCELED' }` when the user closes the sheet. */
function isUserCancellation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		(error as { statusCode?: string }).statusCode === 'CANCELED'
	);
}

/**
 * Google Pay button. Loads the SDK, checks readiness, renders the native
 * Google Pay button and forwards the resulting tokenization data.
 *
 * Payment provisioning (creating the backend payment, submitting the token and
 * confirming the subscription) is intentionally NOT handled here — the parent
 * page owns the full payment state machine.
 */
export default function GooglePayButton({ priceCents, currency, disabled, onToken, onStateChange }: GooglePayButtonProps) {
	const { t, i18n } = useTranslation();
	const containerRef = useRef<HTMLDivElement>(null);
	const [state, setState] = useState<GooglePayButtonState>('loading');
	const [errorDetail, setErrorDetail] = useState<string | null>(null);

	const onTokenRef = useRef(onToken);
	useEffect(() => {
		onTokenRef.current = onToken;
	}, [onToken]);

	const onStateChangeRef = useRef(onStateChange);
	useEffect(() => {
		onStateChangeRef.current = onStateChange;
	}, [onStateChange]);

	const setButtonState = useCallback((next: GooglePayButtonState) => {
		setState(next);
		onStateChangeRef.current?.(next);
	}, []);

	useEffect(() => {
		let cancelled = false;
		let mounted: HTMLElement | null = null;
		const container = containerRef.current;

		const fail = (message: string, error: unknown) => {
			console.error('[GooglePay]', message, error);
			if (cancelled) return;
			setErrorDetail(toErrorMessage(error));
			setButtonState('error');
		};

		const requestPayment = async (client: GooglePayClient): Promise<void> => {
			let paymentData: GooglePayPaymentData;
			try {
				paymentData = await client.loadPaymentData(buildPaymentDataRequest(priceCents, currency));
			} catch (error) {
				if (isUserCancellation(error)) {
					// The user closed the payment sheet — not an error.
					console.info('[GooglePay] payment sheet cancelled by the user');
					return;
				}
				fail('loadPaymentData failed', error);
				return;
			}

			try {
				await onTokenRef.current(paymentData.paymentMethodData.tokenizationData);
			} catch (error) {
				fail('payment token handler failed', error);
			}
		};

		(async () => {
			try {
				if (!getStripePublishableKey()) {
					// Public config missing: initialization still works, but the
					// tokenization step will fail. Logged so it is diagnosable.
					console.warn(
						'[GooglePay] VITE_STRIPE_PUBLISHABLE_KEY is not set — Stripe gateway tokenization will fail. ' +
							'Set it in .env (public pk_... key) and restart the frontend.',
					);
				}

				const payments = await loadGooglePay();
				const merchantId = getGooglePayMerchantId();
				const client = new payments.api.PaymentsClient({
					environment: getGooglePayEnvironment(),
					...(merchantId ? { merchantInfo: { merchantId } } : {}),
				});

				const ready = await client.isReadyToPay(buildIsReadyToPayRequest());
				if (cancelled) return;

				if (!ready?.result) {
					console.info('[GooglePay] not available on this device/browser (isReadyToPay = false)');
					setButtonState('unavailable');
					return;
				}

				const button = client.createButton({
					onClick: () => requestPayment(client),
					buttonType: 'pay',
					buttonColor: 'black',
					buttonSizeMode: 'fill',
					buttonLocale: resolveLocale(i18n.language),
				});

				container?.replaceChildren(button);
				mounted = button;
				setButtonState('ready');
			} catch (error) {
				fail('initialization failed', error);
			}
		})();

		return () => {
			cancelled = true;
			mounted?.remove();
			container?.replaceChildren();
		};
	}, [priceCents, currency, i18n.language, setButtonState]);

	if (state === 'loading') {
		return (
			<Button variant="secondary" disabled className="w-full">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
				{t('subscription.googlePay.loading')}
			</Button>
		);
	}

	if (state === 'unavailable') {
		return (
			<div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted px-4 py-4">
				<p className="text-sm text-foreground/60">{t('subscription.googlePay.unavailable')}</p>
				<p className="text-xs text-foreground/40">{t('subscription.googlePay.unavailableNote')}</p>
			</div>
		);
	}

	if (state === 'error') {
		return (
			<div className="flex flex-col gap-1 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
				<div className="flex items-center gap-3">
					<AlertIcon size={18} className="shrink-0 text-rose-400" />
					<p className="text-sm text-rose-300">{t('subscription.googlePay.initFailed')}</p>
				</div>
				{errorDetail && <p className="pl-7 text-xs leading-relaxed text-rose-300/60">{errorDetail}</p>}
			</div>
		);
	}

	return <div ref={containerRef} className={`w-full transition-opacity ${disabled ? 'pointer-events-none opacity-40' : 'opacity-100'}`} />;
}
