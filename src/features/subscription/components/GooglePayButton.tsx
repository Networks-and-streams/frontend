import { useEffect, useRef, useState } from 'react';
import Button from '@/shared/components/ui/Button/Button';
import { AlertIcon } from '@/shared/icons';
import {
	buildIsReadyToPayRequest,
	buildPaymentDataRequest,
	getGooglePayEnvironment,
	getGooglePayMerchantId,
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

/**
 * Google Pay button. Loads the SDK, checks readiness, renders the native
 * Google Pay button and forwards the resulting tokenization data.
 *
 * Payment provisioning (creating the backend payment, submitting the token and
 * confirming the subscription) is intentionally NOT handled here — the parent
 * page owns the full payment state machine.
 */
export default function GooglePayButton({ priceCents, currency, disabled, onToken, onStateChange }: GooglePayButtonProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [state, setState] = useState<GooglePayButtonState>('loading');

	const onTokenRef = useRef(onToken);
	useEffect(() => {
		onTokenRef.current = onToken;
	}, [onToken]);

	const onStateChangeRef = useRef(onStateChange);
	useEffect(() => {
		onStateChangeRef.current = onStateChange;
	}, [onStateChange]);

	const setButtonState = (next: GooglePayButtonState) => {
		setState(next);
		onStateChangeRef.current?.(next);
	};

	useEffect(() => {
		let cancelled = false;
		let mounted: HTMLElement | null = null;
		const container = containerRef.current;

		const requestPayment = async (client: GooglePayClient): Promise<void> => {
			try {
				const paymentData: GooglePayPaymentData = await client.loadPaymentData(buildPaymentDataRequest(priceCents, currency));
				await onTokenRef.current(paymentData.paymentMethodData.tokenizationData);
			} catch (error) {
				// The user cancelled the sheet or the request failed before any
				// success callback. Informational only — the parent handles errors.
				console.warn('Google Pay dialog closed without completing:', error);
			}
		};

		(async () => {
			try {
				const payments = await loadGooglePay();
				const merchantId = getGooglePayMerchantId();
				const client = new payments.paymentsClient({
					environment: getGooglePayEnvironment(),
					...(merchantId ? { merchantInfo: { merchantId } } : {}),
				});

				const ready = await client.isReadyToPay(buildIsReadyToPayRequest());
				if (cancelled) return;

				if (!ready?.result) {
					setButtonState('unavailable');
					return;
				}

				const button = client.createButton({
					onClick: () => requestPayment(client),
					buttonType: 'pay',
					buttonColor: 'black',
					buttonSizeMode: 'fill',
					buttonLocale: 'en',
				});

				container?.replaceChildren(button);
				mounted = button;
				setButtonState('ready');
			} catch {
				if (!cancelled) setButtonState('error');
			}
		})();

		return () => {
			cancelled = true;
			mounted?.remove();
			container?.replaceChildren();
		};
	}, [priceCents, currency]);

	if (state === 'loading') {
		return (
			<Button variant="secondary" disabled className="w-full">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
				Loading Google Pay…
			</Button>
		);
	}

	if (state === 'unavailable') {
		return (
			<div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted px-4 py-4">
				<p className="text-sm text-foreground/60">Google Pay is not available for this device/browser right now.</p>
				<p className="text-xs text-foreground/40">Payment is processed by the backend payment gateway. Please try again later, or use a device with Google Pay support.</p>
			</div>
		);
	}

	if (state === 'error') {
		return (
			<div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
				<AlertIcon size={18} className="shrink-0 text-rose-400" />
				<p className="text-sm text-rose-300">Could not initialize Google Pay. Check the connection and reload the page.</p>
			</div>
		);
	}

	return <div ref={containerRef} className={`w-full transition-opacity ${disabled ? 'pointer-events-none opacity-40' : 'opacity-100'}`} />;
}
