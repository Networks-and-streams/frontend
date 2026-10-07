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
import AboutPage from '@/features/about/pages/AboutPage';
import HomePage from '@/features/home/pages/HomePage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import ConfirmEmailPage from '@/features/profile/pages/ConfirmEmailPage';
import { useAuthStore } from '@/features/auth/store/auth';
import { useSubscriptionStore } from '@/features/subscription/store/subscriptionStore';
import { useSavedGraphsStore } from '@/features/graph/store/savedGraphsStore';
import PublicOnly from './guards/PublicOnly';
import RequireAuth from './guards/RequireAuth';
import RequireInactiveSubscription from './guards/RequireInactiveSubscription';

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
			{/* Home / Welcome — public entry point for everyone. */}
			<Route index element={<HomePage />} />

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

			{/* Public documentation page — reachable signed in or out. */}
			<Route path="/about" element={<AboutPage />} />

			{/* Authenticated, subscription required (premium not active). */}
			<Route
				path="/subscribe"
				element={
					<RequireInactiveSubscription>
						<SubscribePage />
					</RequireInactiveSubscription>
				}
			/>

			{/* Authenticated; free users get a daily run limit (enforced by the backend). */}
			<Route
				path="/graph"
				element={
					<RequireAuth>
						<GraphPage />
					</RequireAuth>
				}
			/>

			<Route
				path="/profile"
				element={
					<RequireAuth>
						<ProfilePage />
					</RequireAuth>
				}
			/>

			{/* Link from a verification / email-change email; the token authorizes it. */}
			<Route path="/confirm-email" element={<ConfirmEmailPage />} />

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
