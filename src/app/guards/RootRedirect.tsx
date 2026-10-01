import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FullScreenLoader from '@/app/components/FullScreenLoader';
import { guardTo, useAccessState } from './access';

/**
 * `/` resolves the single correct destination for the current auth +
 * subscription state. Every post-auth navigation funnels through here so the
 * routing decision is kept in one place.
 */
export default function RootRedirect() {
	const { t } = useTranslation();
	const access = useAccessState();

	if (!access.authReady) {
		return <FullScreenLoader message={t('common.loading')} />;
	}

	if (access.isAuthenticated && !access.subscriptionReady) {
		return <FullScreenLoader message={t('common.checkingAccount')} />;
	}

	return <Navigate to={guardTo(access)} replace />;
}