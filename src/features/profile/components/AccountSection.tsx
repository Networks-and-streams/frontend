import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { SpinnerIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { formatDateTime } from '@/shared/utils/format';
import { profileApi } from '../api/profile.api';
import type { Profile } from '../types';
import ProfileSection, { DetailRow } from './ProfileSection';

const fieldClass =
	'h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground transition-all duration-200 placeholder:text-foreground/30 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20';

/** Email (verification status, resend, change), registration date, sign-in methods. */
export default function AccountSection({ profile }: { profile: Profile }) {
	const { t } = useTranslation();
	const [sending, setSending] = useState(false);
	const [changing, setChanging] = useState(false);

	const methods = [
		...(profile.hasPassword ? [t('profile.account.methodPassword')] : []),
		...(profile.providers.includes('GOOGLE') ? [t('profile.account.methodGoogle')] : []),
	];

	const resend = async () => {
		setSending(true);
		try {
			await profileApi.sendVerification();
			toast.success(t('profile.email.sent'), t('profile.email.sentDetail', { email: profile.email }));
		} catch (error) {
			toast.error(t('profile.email.sendFailed'), getApiErrorMessage(error));
		} finally {
			setSending(false);
		}
	};

	return (
		<ProfileSection title={t('profile.account.title')}>
			{!profile.emailVerified && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
					<p className="text-sm text-amber-200">{t('profile.email.unverifiedNotice')}</p>
					<Button variant="secondary" size="sm" onClick={() => void resend()} disabled={sending}>
						{sending && <SpinnerIcon size={14} className="animate-spin" />}
						{t('profile.email.resend')}
					</Button>
				</div>
			)}
			<dl>
				<DetailRow label={t('profile.account.email')}>
					<span className="flex flex-wrap items-center justify-end gap-2">
						<span className="break-all">{profile.email}</span>
						<span
							className={`rounded-full border px-2 py-0.5 text-[11px] ${
								profile.emailVerified
									? 'border-accent/30 bg-accent/10 text-accent'
									: 'border-amber-400/30 bg-amber-400/10 text-amber-300'
							}`}
						>
							{profile.emailVerified ? t('profile.email.verified') : t('profile.email.unverified')}
						</span>
						{!changing && (
							<Button variant="ghost" size="sm" onClick={() => setChanging(true)}>
								{t('profile.email.change')}
							</Button>
						)}
					</span>
				</DetailRow>
				<DetailRow label={t('profile.account.memberSince')}>{formatDateTime(profile.createdAt)}</DetailRow>
				<DetailRow label={t('profile.account.signInMethods')}>{methods.join(', ') || '—'}</DetailRow>
			</dl>
			{changing &&
				(profile.hasPassword ? (
					<ChangeEmailForm onDone={() => setChanging(false)} />
				) : (
					<p className="rounded-xl border border-border bg-muted px-3 py-2.5 text-xs text-foreground/60">
						{t('profile.email.needsPassword')}
					</p>
				))}
		</ProfileSection>
	);
}

function ChangeEmailForm({ onDone }: { onDone: () => void }) {
	const { t } = useTranslation();
	const [newEmail, setNewEmail] = useState('');
	const [password, setPassword] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (!newEmail.trim() || !password) {
			setError(t('profile.email.fillBoth'));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await profileApi.requestEmailChange({ newEmail: newEmail.trim(), password });
			toast.success(t('profile.email.changeSent'), t('profile.email.changeSentDetail', { email: newEmail.trim() }));
			onDone();
		} catch (submitError) {
			setError(getApiErrorMessage(submitError));
		} finally {
			setSaving(false);
		}
	};

	return (
		<form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-3 rounded-2xl border border-border p-4">
			<p className="text-xs text-foreground/50">{t('profile.email.changeHint')}</p>
			<div className="flex flex-col gap-1.5">
				<label htmlFor="new-email" className="text-xs text-foreground/50">
					{t('profile.email.newEmail')}
				</label>
				<input
					id="new-email"
					type="email"
					autoComplete="email"
					value={newEmail}
					onChange={(e) => setNewEmail(e.target.value)}
					className={fieldClass}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label htmlFor="email-change-password" className="text-xs text-foreground/50">
					{t('profile.password.current')}
				</label>
				<input
					id="email-change-password"
					type="password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={fieldClass}
				/>
			</div>
			{error && (
				<p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
					{error}
				</p>
			)}
			<div className="flex gap-2">
				<Button type="submit" variant="primary" size="sm" disabled={saving}>
					{saving && <SpinnerIcon size={14} className="animate-spin" />}
					{t('profile.email.sendLink')}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onDone}>
					{t('profile.cancel')}
				</Button>
			</div>
		</form>
	);
}
