import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { useAccessState, type GuardProps } from './access';

/**
 * Authenticated route that does not require a paid subscription (`/graph`).
 * Free users may use it within the backend-enforced daily run limit.
 */
export default function RequireAuth({ children }: GuardProps) {
	const { t } = useTranslation();
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message={t('common.loading')} />;
	}

	if (!access.isAuthenticated) {
		return <Navigate to="/auth" replace />;
	}

	return children;
}
