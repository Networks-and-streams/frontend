import { GoogleIcon } from '@/shared/icons';
import { BASE_URL } from '@/shared/api/http';

interface AuthFormProps {
	mode: 'login' | 'register';
}

/**
 * OAuth-only auth form.
 *
 * The email/password form is currently disabled (commented out in an earlier
 * commit; re-enable from git history if email auth is needed). The whole app —
 * frontend and API — is served from a single public origin (localhost Nginx +
 * ngrok), so the OAuth button must navigate to the same-origin /api path:
 * Nginx/Vite strip the /api prefix and the backend serves /oauth/google.
 */
export default function AuthForm({ mode }: AuthFormProps) {
	const isLogin = mode === 'login';

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
				<p className="text-sm text-foreground/40">{isLogin ? 'Sign in to continue to your workspace.' : 'Register to start solving graphs.'}</p>
			</div>

			<button
				type="button"
				onClick={() => {
					window.location.href = `${BASE_URL}/oauth/google`;
				}}
				className="inline-flex items-center justify-center gap-3 rounded-2xl border border-border bg-muted px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:bg-muted-hover active:scale-[0.98]">
				<GoogleIcon size={18} />
				Continue with Google
			</button>
		</div>
	);
}