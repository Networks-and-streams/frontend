import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { SpinnerIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { profileApi } from '../api/profile.api';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../types';
import ProfileSection from './ProfileSection';

const fieldClass =
	'h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground transition-all duration-200 placeholder:text-foreground/30 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20';

/**
 * Change the password, or set a first one for a Google-only account. On
 * success the backend signs out every other device (`onChanged` refreshes the
 * device list and profile).
 */
export default function PasswordSection({ hasPassword, onChanged }: { hasPassword: boolean; onChanged: () => void }) {
	const { t } = useTranslation();
	const [current, setCurrent] = useState('');
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const validationError = (): string | null => {
		if (hasPassword && !current) return t('profile.password.errors.currentRequired');
		if (next.length < PASSWORD_MIN_LENGTH || next.length > PASSWORD_MAX_LENGTH) {
			return t('profile.password.errors.length', { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH });
		}
		if (hasPassword && next === current) return t('profile.password.errors.same');
		if (next !== confirm) return t('profile.password.errors.mismatch');
		return null;
	};

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const problem = validationError();
		setError(problem);
		if (problem || saving) return;

		setSaving(true);
		try {
			await profileApi.changePassword({ ...(hasPassword && { currentPassword: current }), newPassword: next });
			setCurrent('');
			setNext('');
			setConfirm('');
			toast.success(
				hasPassword ? t('profile.password.changed') : t('profile.password.set'),
				t('profile.password.othersSignedOut'),
			);
			onChanged();
		} catch (submitError) {
			setError(getApiErrorMessage(submitError));
		} finally {
			setSaving(false);
		}
	};

	return (
		<ProfileSection
			title={hasPassword ? t('profile.password.titleChange') : t('profile.password.titleSet')}
			description={hasPassword ? t('profile.password.descriptionChange') : t('profile.password.descriptionSet')}
		>
			<form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3" noValidate>
				{hasPassword && (
					<div className="flex flex-col gap-1.5">
						<label htmlFor="current-password" className="text-xs text-foreground/50">
							{t('profile.password.current')}
						</label>
						<input
							id="current-password"
							type="password"
							autoComplete="current-password"
							value={current}
							onChange={(e) => setCurrent(e.target.value)}
							className={fieldClass}
						/>
					</div>
				)}
				<div className="flex flex-col gap-1.5">
					<label htmlFor="new-password" className="text-xs text-foreground/50">
						{t('profile.password.new')}
					</label>
					<input
						id="new-password"
						type="password"
						autoComplete="new-password"
						value={next}
						onChange={(e) => setNext(e.target.value)}
						aria-describedby="new-password-hint"
						className={fieldClass}
					/>
					<p id="new-password-hint" className="text-[11px] text-foreground/40">
						{t('profile.password.hint', { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })}
					</p>
				</div>
				<div className="flex flex-col gap-1.5">
					<label htmlFor="confirm-password" className="text-xs text-foreground/50">
						{t('profile.password.confirm')}
					</label>
					<input
						id="confirm-password"
						type="password"
						autoComplete="new-password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						className={fieldClass}
					/>
				</div>

				{error && (
					<p
						role="alert"
						className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300"
					>
						{error}
					</p>
				)}

				<Button type="submit" variant="primary" disabled={saving} className="self-start">
					{saving && <SpinnerIcon size={15} className="animate-spin" />}
					{hasPassword ? t('profile.password.submitChange') : t('profile.password.submitSet')}
				</Button>
			</form>
		</ProfileSection>
	);
}
