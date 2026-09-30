import { useEffect } from 'react';
import {
	createBrowserRouter,
	createRoutesFromElements,
	Navigate,
	Outlet,
	Route,
	RouterProvider,
} from 'react-router-dom';
import ToastViewport from '@/shared/components/ui/Toast/ToastViewport';
import AuthPage from '@/features/auth/pages/AuthPage';
import AuthCallbackPage from '@/features/auth/pages/AuthCallbackPage';
import SubscribePage from '@/features/subscription/pages/SubscribePage';
import GraphPage from '@/features/graph/pages/GraphPage';
import { useAuthStore } from '@/features/auth/store/auth';
import { useSubscriptionStore } from '@/features/subscription/store/subscriptionStore';
import { useSavedGraphsStore } from '@/features/graph/store/savedGraphsStore';
import PublicOnly from './guards/PublicOnly';
import RequireInactiveSubscription from './guards/RequireInactiveSubscription';
import RootRedirect from './guards/RootRedirect';

/**
 * State orchestration:
 *
 * 1. On startup the auth store restores the session via the HttpOnly refresh
 *    cookie (POST /auth/refresh).
 * 2. Whenever a session exists, the subscription store loads the authoritative
 *    subscription (GET /subscriptions/me).
 * 3. Whenever a session exists, the saved-graphs store loads the user's
 *    persisted graphs once (GET /graphs) — the collection used by "My Graphs".
 * 4. Route guards map (authReady, isAuthenticated, subscriptionActive) to the
 *    correct page — the backend remains the source of truth.
 */
function RootLayout() {
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const subscriptionLoadState = useSubscriptionStore((s) => s.loadState);
	const fetchSubscription = useSubscriptionStore((s) => s.fetch);
	const resetSubscription = useSubscriptionStore((s) => s.reset);

	const savedGraphsFetched = useSavedGraphsStore((s) => s.fetched);
	const savedGraphsLoading = useSavedGraphsStore((s) => s.isLoading);
	const fetchSavedGraphs = useSavedGraphsStore((s) => s.fetchGraphs);
	const clearSavedGraphs = useSavedGraphsStore((s) => s.clear);

	useEffect(() => {
		if (isAuthenticated) {
			if (subscriptionLoadState === 'idle') {
				void fetchSubscription();
			}
			if (!savedGraphsFetched && !savedGraphsLoading) {
				void fetchSavedGraphs();
			}
		} else {
			resetSubscription();
			// Never leak one user's graphs into another session.
			clearSavedGraphs();
		}
	}, [
		isAuthenticated,
		subscriptionLoadState,
		fetchSubscription,
		resetSubscription,
		savedGraphsFetched,
		savedGraphsLoading,
		fetchSavedGraphs,
		clearSavedGraphs,
	]);

	return (
		<>
			<Outlet />
			<ToastViewport />
		</>
	);
}

const router = createBrowserRouter(
	createRoutesFromElements(
		<Route element={<RootLayout />}>
			<Route index element={<RootRedirect />} />

			<Route
				path="/auth"
				element={
					<PublicOnly>
						<AuthPage />
					</PublicOnly>
				}
			/>
			{/* OAuth callback — backend redirects here after Google sign-in. */}
			<Route path="/auth/callback" element={<AuthCallbackPage />} />

			{/* Authenticated, subscription required (premium not active). */}
			<Route
				path="/subscribe"
				element={
					<RequireInactiveSubscription>
						<SubscribePage />
					</RequireInactiveSubscription>
				}
			/>

			{/* Authenticated + active subscription. */}
			<Route
				path="/graph"
				element={
					// {/* <RequireSubscription> */ }
					< GraphPage />
					// </RequireSubscription>
				}
			/>

			<Route path="*" element={<Navigate to="/" replace />} />
		</Route>,
	),
);

function App() {
	const bootstrap = useAuthStore((s) => s.bootstrap);

	useEffect(() => {
		void bootstrap();
	}, [bootstrap]);

	return <RouterProvider router={router} />;
}

export default App;
