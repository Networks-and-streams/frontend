import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { SpinnerIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { useAuthStore } from '@/features/auth/store/auth';
import { profileApi } from '../api/profile.api';
import type { Profile } from '../types';
import ProfileSection from './ProfileSection';

/**
 * Permanent account deletion, behind an explicit second step: the password
 * (or, for Google-only accounts, the email typed out).
 */
export default function DeleteAccountSection({ profile }: { profile: Profile }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const logout = useAuthStore((s) => s.logout);
	const [open, setOpen] = useState(false);
	const [confirmation, setConfirmation] = useState('');
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (!confirmation) return;
		setDeleting(true);
		setError(null);
		try {
			await profileApi.deleteAccount(
				profile.hasPassword ? { password: confirmation } : { confirmEmail: confirmation },
			);
			// The session no longer exists server-side; only local state is left to clear.
			await logout().catch(() => undefined);
			toast.success(t('profile.delete.done'));
			navigate('/', { replace: true });
		} catch (deleteError) {
			setError(getApiErrorMessage(deleteError));
			setDeleting(false);
		}
	};

	return (
		<ProfileSection title={t('profile.delete.title')} description={t('profile.delete.description')}>
			{!open ? (
				<Button variant="danger" size="sm" className="self-start" onClick={() => setOpen(true)}>
					{t('profile.delete.start')}
				</Button>
			) : (
				<form
					onSubmit={submit}
					noValidate
					className="flex max-w-md flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4"
				>
					<ul className="list-disc space-y-1 pl-5 text-xs text-foreground/70">
						<li>{t('profile.delete.consequenceData')}</li>
						<li>{t('profile.delete.consequenceSubscription')}</li>
						<li>{t('profile.delete.consequencePayments')}</li>
					</ul>
					<div className="flex flex-col gap-1.5">
						<label htmlFor="delete-confirmation" className="text-xs text-foreground/60">
							{profile.hasPassword
								? t('profile.delete.passwordLabel')
								: t('profile.delete.emailLabel', { email: profile.email })}
						</label>
						<input
							id="delete-confirmation"
							type={profile.hasPassword ? 'password' : 'email'}
							autoComplete={profile.hasPassword ? 'current-password' : 'off'}
							value={confirmation}
							onChange={(e) => setConfirmation(e.target.value)}
							className="h-10 w-full rounded-xl border border-rose-500/30 bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
						/>
					</div>
					{error && (
						<p role="alert" className="text-xs text-rose-300">
							{error}
						</p>
					)}
					<div className="flex gap-2">
						<Button type="submit" variant="danger" size="sm" disabled={!confirmation || deleting}>
							{deleting && <SpinnerIcon size={14} className="animate-spin" />}
							{t('profile.delete.confirm')}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setOpen(false);
								setConfirmation('');
								setError(null);
							}}
						>
							{t('profile.cancel')}
						</Button>
					</div>
				</form>
			)}
		</ProfileSection>
	);
}
