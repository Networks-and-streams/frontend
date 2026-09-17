import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { useAuthStore } from '../store/auth';

/**
 * OAuth callback. The backend redirects the browser here (FRONTEND_URL env)
 * after the Google OAuth flow, having already set the refresh token cookie.
 * We silently exchange it for an access token and hand routing to the root
 * redirect, which consults the subscription state.
 */
export default function AuthCallbackPage() {
	const navigate = useNavigate();
	const bootstrap = useAuthStore((s) => s.bootstrap);
	const processed = useRef(false);

	useEffect(() => {
		if (processed.current) return;
		processed.current = true;

		bootstrap()
			.then((ok) => {
				navigate(ok ? '/' : '/auth', { replace: true });
			})
			.catch(() => {
				navigate('/auth', { replace: true });
			});
	}, [bootstrap, navigate]);

	return <FullScreenLoader message="Restoring your session…" />;
}