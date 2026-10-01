import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { GoogleIcon, SpinnerIcon } from '@/shared/icons';
import { BASE_URL, getApiErrorMessage } from '@/shared/api/http';
import { useAuthStore } from '../store/auth';

interface AuthFormProps {
	mode: 'login' | 'register';
}

/** Basic client-side email shape check (the backend validates authoritatively). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const inputClass =
	'h-10 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-foreground/30 transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60';

/**
 * Email/password + Google authentication form.
 *
 * Submitting calls the existing auth store (`login`/`register`), which exchanges
 * credentials for an access token via the backend and restores the session. On
 * success the route guards redirect; this form never navigates on its own.
 *
 * The whole app — frontend and API — is served from a single public origin
 * (localhost Nginx + ngrok), so the OAuth button navigates to the same-origin
 * /api path: Nginx/Vite strip the /api prefix and the backend serves /oauth/google.
 */
export default function AuthForm({ mode }: AuthFormProps) {
	const { t } = useTranslation();
	const isLogin = mode === 'login';

	const login = useAuthStore((s) => s.login);
	const register = useAuthStore((s) => s.register);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (submitting) return;

		const normalizedEmail = email.trim();
		if (!EMAIL_PATTERN.test(normalizedEmail)) {
			setError(t('auth.invalidEmail'));
			return;
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			setError(t('auth.passwordTooShort'));
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			if (isLogin) {
				await login(normalizedEmail, password);
			} else {
				await register(normalizedEmail, password);
			}
			// Success: the auth state flips and the route guards redirect away.
		} catch (submitError) {
			setError(getApiErrorMessage(submitError));
			setSubmitting(false);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
					{isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
				</h1>
				<p className="text-sm text-foreground/40">
					{isLogin ? t('auth.signInToContinue') : t('auth.registerToStart')}
				</p>
			</div>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
				<div className="flex flex-col gap-1.5">
					<label htmlFor="auth-email" className="text-xs text-foreground/50">
						{t('auth.email')}
					</label>
					<input
						id="auth-email"
						name="email"
						type="email"
						inputMode="email"
						autoComplete="email"
						required
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder={t('auth.emailPlaceholder')}
						disabled={submitting}
						className={inputClass}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor="auth-password" className="text-xs text-foreground/50">
						{t('auth.password')}
					</label>
					<input
						id="auth-password"
						name="password"
						type="password"
						autoComplete={isLogin ? 'current-password' : 'new-password'}
						minLength={MIN_PASSWORD_LENGTH}
						required
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						placeholder={t('auth.passwordPlaceholder')}
						disabled={submitting}
						className={inputClass}
					/>
				</div>

				{error && (
					<p
						role="alert"
						className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-300"
					>
						{error}
					</p>
				)}

				<Button type="submit" variant="primary" className="w-full" disabled={submitting}>
					{submitting ? (
						<>
							<SpinnerIcon size={15} className="animate-spin" />
							{t('auth.submitting')}
						</>
					) : isLogin ? (
						t('auth.signIn')
					) : (
						t('auth.register')
					)}
				</Button>
			</form>

			<div className="flex items-center gap-3">
				<span className="h-px flex-1 bg-border" />
				<span className="text-xs uppercase tracking-[0.15em] text-foreground/30">
					{t('auth.orContinueWith')}
				</span>
				<span className="h-px flex-1 bg-border" />
			</div>

			<button
				type="button"
				disabled={submitting}
				onClick={() => {
					window.location.href = `${BASE_URL}/oauth/google`;
				}}
				className="inline-flex items-center justify-center gap-3 rounded-2xl border border-border bg-muted px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:bg-muted-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60">
				<GoogleIcon size={18} />
				{t('auth.continueWithGoogle')}
			</button>
		</div>
	);
}
