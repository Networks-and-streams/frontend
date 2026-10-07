import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '@/app/components/AppShell';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon, CheckCircleFilledIcon, SpinnerIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';
import { useAuthStore } from '@/features/auth/store/auth';
import { profileApi } from '../api/profile.api';
import type { EmailConfirmation } from '../types';

/**
 * `/confirm-email?token=…` — the link from a verification or email-change
 * email. Works signed in or out (the token alone authorizes it).
 */
export default function ConfirmEmailPage() {
	const { t } = useTranslation();
	const [params] = useSearchParams();
	const token = params.get('token') ?? '';
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const [result, setResult] = useState<EmailConfirmation | null>(null);
	const [error, setError] = useState<string | null>(token ? null : t('confirmEmail.missingToken'));
	// Tokens are single-use: never send the same one twice (StrictMode re-runs effects).
	const sentRef = useRef(false);

	useEffect(() => {
		if (!token || sentRef.current) return;
		sentRef.current = true;
		profileApi
			.confirmEmail(token)
			.then(setResult)
			.catch((confirmError) => setError(getApiErrorMessage(confirmError)));
	}, [token]);

	const next = isAuthenticated ? '/profile' : '/auth';

	return (
		<AppShell>
			<div className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-card p-6">
				{error ? (
					<StateBlock icon={<AlertIcon size={22} />} title={t('confirmEmail.failedTitle')} description={error} />
				) : !result ? (
					<div className="flex items-center justify-center gap-2 py-10 text-foreground/50" role="status">
						<SpinnerIcon size={18} className="animate-spin" />
						{t('confirmEmail.checking')}
					</div>
				) : (
					<StateBlock
						icon={<CheckCircleFilledIcon size={22} />}
						title={result.purpose === 'verify' ? t('confirmEmail.verifiedTitle') : t('confirmEmail.changedTitle')}
						description={
							result.purpose === 'verify'
								? t('confirmEmail.verifiedDescription', { email: result.email })
								: t('confirmEmail.changedDescription', { email: result.email })
						}
					/>
				)}
				<div className="mt-4 flex justify-center">
					<Link to={next} className="text-sm font-medium text-accent hover:underline">
						{isAuthenticated ? t('confirmEmail.toProfile') : t('confirmEmail.toSignIn')}
					</Link>
				</div>
			</div>
		</AppShell>
	);
}
