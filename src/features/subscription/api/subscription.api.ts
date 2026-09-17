import http from '@/shared/api/http';
import { paymentEndpoints, subscriptionEndpoints } from './endpoints';
import type {
	CreatePaymentDto,
	Payment,
	ProcessGooglePayDto,
	Subscription,
} from '../types';

export const subscriptionApi = {
	/** GET /subscriptions/me — the single authoritative source for subscription state. */
	getCurrentSubscription: async () => http.get<Subscription>(subscriptionEndpoints.me),

	/** POST /payments — creates (or returns an existing PENDING) payment. */
	createPayment: async (dto: CreatePaymentDto) => http.post<Payment>(paymentEndpoints.create, dto),

	/** GET /payments/:id — current state of an existing payment. */
	getPayment: async (id: string) => http.get<Payment>(paymentEndpoints.byId(id)),

	/** POST /payments/:id/google-pay — submits the Google Pay token to the backend. */
	processGooglePay: async (id: string, dto: ProcessGooglePayDto) =>
		http.post<Payment>(paymentEndpoints.processGooglePay(id), dto),
};