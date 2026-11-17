import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The page drives everything through `subscriptionApi`; mocking keeps the
// test off the network and lets each case define its own backend answers.
vi.mock('../api/subscription.api', () => ({
	subscriptionApi: {
		getCurrentSubscription: vi.fn(),
		getPaymentConfig: vi.fn(),
		createPayment: vi.fn(),
		processGooglePay: vi.fn(),
		getPayment: vi.fn(),
	},
}));

import { subscriptionApi } from '../api/subscription.api';
import { PAYMENT_STATUS, SUBSCRIPTION_STATUS, type Payment, type Subscription } from '../types';
import SubscribePage from './SubscribePage';

const api = vi.mocked(subscriptionApi);

function payment(status: Payment['status'], overrides: Partial<Payment> = {}): Payment {
	return {
		id: 'pay-1',
		userId: 'user-1',
		subscriptionId: 'sub-1',
		provider: 'STRIPE',
		paymentMethod: 'GOOGLE_PAY',
		status,
		plan: 'PREMIUM',
		amount: 999,
		currency: 'USD',
		providerPaymentId: null,
		providerMetadata: null,
		createdAt: '2026-11-17T00:00:00.000Z',
		updatedAt: '2026-11-17T00:00:00.000Z',
		...overrides,
	};
}

const ACTIVE_SUBSCRIPTION: Subscription = {
	id: 'sub-1',
	userId: 'user-1',
	status: SUBSCRIPTION_STATUS.ACTIVE,
	plan: 'PREMIUM',
	startedAt: '2026-11-17T00:00:00.000Z',
	expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
	createdAt: '2026-11-17T00:00:00.000Z',
	updatedAt: '2026-11-17T00:00:00.000Z',
};

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/subscribe']}>
			<SubscribePage />
		</MemoryRouter>,
	);
}

const TEST_BUTTON_NAME = /test purchase/i;

describe('SubscribePage — PAYMENTS_TEST_MODE (test purchase)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('offers the test purchase instead of Google Pay and completes the flow', async () => {
		api.getPaymentConfig.mockResolvedValue({ testMode: true });
		api.createPayment.mockResolvedValue(payment(PAYMENT_STATUS.PENDING));
		api.processGooglePay.mockResolvedValue(
			payment(PAYMENT_STATUS.SUCCEEDED, { providerPaymentId: 'test_pay-1' }),
		);
		api.getCurrentSubscription.mockResolvedValue(ACTIVE_SUBSCRIPTION);

		renderPage();

		// Test affordance replaces the Google Pay button; the note and the
		// badge tell the user no real payment provider is involved.
		expect(await screen.findByRole('button', { name: TEST_BUTTON_NAME })).toBeInTheDocument();
		expect(screen.getByText(/test mode is enabled/i)).toBeInTheDocument();
		expect(screen.getByText(/^test mode$/i)).toBeInTheDocument();
		expect(screen.queryByText(/loading google pay/i)).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: TEST_BUTTON_NAME }));

		// The full purchase flow runs: create → submit → backend confirms.
		await waitFor(() => expect(api.createPayment).toHaveBeenCalledTimes(1));
		expect(api.createPayment).toHaveBeenCalledWith({ plan: 'PREMIUM', paymentMethod: 'GOOGLE_PAY' });
		await waitFor(() =>
			expect(api.processGooglePay).toHaveBeenCalledWith('pay-1', {
				tokenData: { type: 'TEST', token: 'test-mode' },
			}),
		);

		// Success state + authoritative subscription re-fetch + way out.
		expect(await screen.findByText(/payment confirmed/i)).toBeInTheDocument();
		await waitFor(() => expect(api.getCurrentSubscription).toHaveBeenCalled());
		expect(await screen.findByRole('button', { name: /go to the app/i })).toBeInTheDocument();
	});

	it('surfaces a failed test purchase and offers a retry', async () => {
		api.getPaymentConfig.mockResolvedValue({ testMode: true });
		api.createPayment.mockResolvedValue(payment(PAYMENT_STATUS.PENDING));
		api.processGooglePay.mockRejectedValue(new Error('gateway unreachable'));

		renderPage();

		fireEvent.click(await screen.findByRole('button', { name: TEST_BUTTON_NAME }));

		expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
		expect(api.getCurrentSubscription).not.toHaveBeenCalled();
	});

	it('keeps the Google Pay flow when test mode is off', async () => {
		api.getPaymentConfig.mockResolvedValue({ testMode: false });

		renderPage();

		expect(await screen.findByText(/one-time payment processed by the backend provider/i)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: TEST_BUTTON_NAME })).not.toBeInTheDocument();
		expect(screen.queryByText(/^test mode$/i)).not.toBeInTheDocument();
	});

	it('falls back to the Google Pay flow when the config cannot be loaded', async () => {
		api.getPaymentConfig.mockRejectedValue(new Error('network down'));

		renderPage();

		expect(await screen.findByText(/one-time payment processed by the backend provider/i)).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: TEST_BUTTON_NAME })).not.toBeInTheDocument();
	});
});
