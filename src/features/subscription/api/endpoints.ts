const BASE = '/payments';

export const paymentEndpoints = {
	create: BASE,
	byId: (id: string) => `${BASE}/${id}`,
	processGooglePay: (id: string) => `${BASE}/${id}/google-pay`,
};

export const subscriptionEndpoints = {
	me: '/subscriptions/me',
};