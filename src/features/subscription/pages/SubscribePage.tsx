import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, getApiErrorMessage } from '@/shared/api/http';
import Button from '@/shared/components/ui/Button/Button';
import AppShell from '@/app/components/AppShell';
import GooglePayButton, { type GooglePayButtonState } from '../components/GooglePayButton';
import { subscriptionApi } from '../api/subscription.api';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
	isTerminalPaymentStatus,
	PAYMENT_METHOD,
	PAYMENT_STATUS,
	PREMIUM_PLAN_CONFIG,
	type GooglePayTokenData,
	type Payment,
} from '../types';
import { formatPrice } from '@/shared/utils';
import { CheckIcon, SpinnerIcon } from '@/shared/icons';

type PayPhase =
	| { status: 'idle' }
	| { status: 'creating' }
	| { status: 'submitting' }
	| { status: 'processing'; paymentId: string }
	| { status: 'succeeded' }
	| { status: 'failed'; reason: string }
	| { status: 'cancelled' };

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 30_000;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function failureReason(payment: Payment): string | null {
	const reason = payment.providerMetadata?.failureReason;
	return typeof reason === 'string' && reason.length > 0 ? reason : null;
}

export default function SubscribePage() {
	const navigate = useNavigate();
	const fetchSubscription = useSubscriptionStore((s) => s.fetch);
	const subscription = useSubscriptionStore((s) => s.subscription);

	const [payPhase, setPayPhase] = useState<PayPhase>({ status: 'idle' });
	const [gpayState, setGpayState] = useState<GooglePayButtonState>('loading');
	const paymentIdRef = useRef<string | null>(null);

	const busy = payPhase.status !== 'idle';

	const finalize = useCallback(
		async (payment: Payment) => {
			if (payment.status === PAYMENT_STATUS.SUCCEEDED) {
				// Backend activates the subscription when the payment succeeds.
				// Re-fetch the authoritative subscription state before unlocking.
				setPayPhase({ status: 'succeeded' });
				await fetchSubscription();
				// The RequireInactiveSubscription route guard redirects to /graph
				// once the subscription reads back ACTIVE.
				return;
			}

			if (payment.status === PAYMENT_STATUS.FAILED) {
				setPayPhase({ status: 'failed', reason: failureReason(payment) ?? 'The payment was declined.' });
				return;
			}

			setPayPhase({ status: 'cancelled' });
		},
		[fetchSubscription],
	);

	const pollUntilTerminal = useCallback(
		async (paymentId: string): Promise<Payment | null> => {
			const deadline = Date.now() + POLL_TIMEOUT_MS;
			while (Date.now() < deadline) {
				await delay(POLL_INTERVAL_MS);
				const current = await subscriptionApi.getPayment(paymentId).catch(() => null);
				if (current && isTerminalPaymentStatus(current.status)) return current;
			}
			return null;
		},
		[],
	);

	const handleToken = useCallback(
		async (token: GooglePayTokenData) => {
			setPayPhase({ status: 'creating' });
			let created: Payment;
			try {
				created = await subscriptionApi.createPayment({
					plan: PREMIUM_PLAN_CONFIG.plan,
					paymentMethod: PAYMENT_METHOD.GOOGLE_PAY,
				});
				paymentIdRef.current = created.id;
			} catch (error) {
				setPayPhase({ status: 'failed', reason: getApiErrorMessage(error, 'Could not create the payment.') });
				return;
			}

			setPayPhase({ status: 'submitting' });
			let payment: Payment;
			try {
				payment = await subscriptionApi.processGooglePay(created.id, { tokenData: token });
			} catch (error) {
				if (error instanceof ApiError && error.status === 409) {
					// Already PROCESSING/terminal — re-read the authoritative state.
					try {
						payment = await subscriptionApi.getPayment(created.id);
					} catch (inner) {
						setPayPhase({
							status: 'failed',
							reason: getApiErrorMessage(inner, 'Payment processing failed.'),
						});
						return;
					}
				} else {
					setPayPhase({
						status: 'failed',
						reason: getApiErrorMessage(error, 'Payment processing failed.'),
					});
					return;
				}
			}

			if (isTerminalPaymentStatus(payment.status)) {
				await finalize(payment);
				return;
			}

			// PENDING/PROCESSING — the provider/webhook is the source of truth.
			setPayPhase({ status: 'processing', paymentId: payment.id });
			const terminal = await pollUntilTerminal(payment.id);
			if (terminal) {
				await finalize(terminal);
			}
			// Timeout: stay in 'processing' and let the user re-check manually.
		},
		[finalize, pollUntilTerminal],
	);

	const checkPaymentStatus = useCallback(async () => {
		const id = paymentIdRef.current;
		if (!id) return;
		setPayPhase({ status: 'processing', paymentId: id });
		try {
			const payment = await subscriptionApi.getPayment(id);
			if (isTerminalPaymentStatus(payment.status)) {
				await finalize(payment);
			}
		} catch (error) {
			setPayPhase({ status: 'failed', reason: getApiErrorMessage(error, 'Could not check the payment status.') });
		}
	}, [finalize]);

	const retry = useCallback(() => {
		setPayPhase({ status: 'idle' });
		paymentIdRef.current = null;
	}, []);

	const goToApp = useCallback(() => {
		navigate('/graph', { replace: true });
	}, [navigate]);

	const priceLabel = formatPrice(PREMIUM_PLAN_CONFIG.amountCents, PREMIUM_PLAN_CONFIG.currency);

	return (
		<AppShell>
			<div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_1fr]">
				<section className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
							Subscribe to Graph Resolver
						</h1>
						<p className="text-sm leading-relaxed text-foreground/50">
							A premium subscription unlocks the full graph-solving workspace. Your
							subscription is linked to your account and managed through the backend
							payment gateway.
						</p>
					</div>

					<div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
						<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
							What you get
						</h2>
						<ul className="flex flex-col gap-3 text-sm text-foreground/70">
							{[
								'Graph input editor with validation',
								'Graph visualization and step-by-step results',
								'Minty shortest-path and Ford–Fulkerson max-flow algorithms',
								'Execution traces for algorithm analysis',
							].map((item) => (
								<li key={item} className="flex items-center gap-3">
									<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
										<CheckIcon size={12} />
									</span>
									{item}
								</li>
							))}
						</ul>
					</div>

					{subscription && (
						<p className="text-xs text-foreground/40">
							Current plan:{' '}
							<span className="font-medium text-foreground/70">{subscription.plan}</span>{' '}
							· status:{' '}
							<span className="font-medium text-foreground/70">{subscription.status}</span>
						</p>
					)}
				</section>

				<section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 lg:self-start">
					<div className="flex items-baseline justify-between">
						<span className="text-sm font-medium text-foreground/60">Premium</span>
						<span className="flex items-baseline gap-1">
							<span className="text-3xl font-semibold tracking-tight text-foreground">{priceLabel}</span>
							<span className="text-sm text-foreground/40">/ {PREMIUM_PLAN_CONFIG.durationDays} days</span>
						</span>
					</div>

					<p className="text-xs leading-relaxed text-foreground/40">
						One-time payment processed by the backend provider (Stripe). The backend
						determines the final amount and currency.
					</p>

					{payPhase.status === 'idle' && (
						<GooglePayButton
							priceCents={PREMIUM_PLAN_CONFIG.amountCents}
							currency={PREMIUM_PLAN_CONFIG.currency}
							disabled={busy}
							onToken={handleToken}
							onStateChange={setGpayState}
						/>
					)}

					{(payPhase.status === 'creating' || payPhase.status === 'submitting') && (
						<PaymentStatusBlock
							title="Starting your payment…"
							description="Sending the payment to the backend gateway."
						/>
					)}

					{payPhase.status === 'processing' && (
						<PaymentStatusBlock
							title="Payment processing"
							description="The provider is confirming your payment. This can take a few moments."
							action={
								<Button variant="secondary" size="sm" onClick={checkPaymentStatus}>
									Check status
								</Button>
							}
						/>
					)}

					{payPhase.status === 'succeeded' && (
						<PaymentStatusBlock
							title="Payment confirmed"
							description="Verifying your subscription and unlocking the app…"
						/>
					)}

					{payPhase.status === 'failed' && (
						<div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4">
							<p className="text-sm font-medium text-rose-300">Payment failed</p>
							<p className="text-xs leading-relaxed text-rose-300/70">{payPhase.reason}</p>
							<Button variant="secondary" size="sm" onClick={retry} className="self-start">
								Try again
							</Button>
						</div>
					)}

					{payPhase.status === 'cancelled' && (
						<div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted px-4 py-4">
							<p className="text-sm text-foreground/70">Payment cancelled.</p>
							<Button variant="secondary" size="sm" onClick={retry} className="self-start">
								Try again
							</Button>
						</div>
					)}

					{payPhase.status === 'succeeded' && gpayState === 'ready' && (
						<Button variant="secondary" onClick={goToApp} className="w-full">
							Go to the app
						</Button>
					)}
				</section>
			</div>
		</AppShell>
	);
}

function PaymentStatusBlock({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted px-4 py-4">
			<div className="flex items-center gap-3">
				<SpinnerIcon size={18} className="animate-spin text-accent" />
				<p className="text-sm font-medium text-foreground/80">{title}</p>
			</div>
			<p className="text-xs leading-relaxed text-foreground/40">{description}</p>
			{action}
		</div>
	);
}