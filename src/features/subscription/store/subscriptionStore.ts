import { create } from 'zustand';
import { subscriptionApi } from '@/features/subscription/api/subscription.api';
import type { Subscription } from '../types';

export type SubscriptionLoadState = 'idle' | 'loading' | 'ready' | 'error';

interface SubscriptionState {
	subscription: Subscription | null;
	/** Load state of the current subscription (GET /subscriptions/me). */
	loadState: SubscriptionLoadState;
	error: string | null;

	fetch: () => Promise<void>;
	reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
	subscription: null,
	loadState: 'idle',
	error: null,

	fetch: async () => {
		set({ loadState: 'loading', error: null });
		try {
			const subscription = await subscriptionApi.getCurrentSubscription();
			set({ subscription, loadState: 'ready' });
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : 'Failed to load subscription.',
				loadState: 'error',
			});
		}
	},

	reset: () => set({ subscription: null, loadState: 'idle', error: null }),
}));