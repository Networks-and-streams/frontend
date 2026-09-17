import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { GoogleIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface AuthFormProps {
	mode: 'login' | 'register';
}

export default function AuthForm({ mode }: AuthFormProps) {
	const navigate = useNavigate();
	const login = useAuthStore((s) => s.login);
	const register = useAuthStore((s) => s.register);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isLogin = mode === 'login';

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			if (isLogin) {
				await login(email, password);
			} else {
				await register(email, password);
			}
			// The root redirect decides the destination based on the
			// subscription state fetched after authentication.
			navigate('/', { replace: true });
		} catch (cause) {
			setError(getApiErrorMessage(cause, isLogin ? 'Sign in failed.' : 'Registration failed.'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
					{isLogin ? 'Welcome back' : 'Create your account'}
				</h1>
				<p className="text-sm text-foreground/40">
					{isLogin ? 'Sign in to continue to your workspace.' : 'Register to start solving graphs.'}
				</p>
			</div>

			<button
				type="button"
				onClick={() => {
					window.location.href = `${API_URL}/oauth/google`;
				}}
				className="inline-flex items-center justify-center gap-3 rounded-2xl border border-border bg-muted px-6 py-3 text-sm font-medium text-foreground transition-all duration-300 hover:bg-muted-hover active:scale-[0.98]"
			>
				<GoogleIcon size={18} />
				Continue with Google
			</button>

			<div className="flex items-center gap-3">
				<div className="h-px flex-1 bg-border" />
				<span className="text-xs uppercase tracking-[0.2em] text-foreground/30">or</span>
				<div className="h-px flex-1 bg-border" />
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<label htmlFor="auth-email" className="text-xs uppercase tracking-[0.2em] text-foreground/40">
						Email
					</label>
					<input
						id="auth-email"
						type="email"
						autoComplete="email"
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className="rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder-muted transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<label htmlFor="auth-password" className="text-xs uppercase tracking-[0.2em] text-foreground/40">
						Password
					</label>
					<input
						id="auth-password"
						type="password"
						autoComplete={isLogin ? 'current-password' : 'new-password'}
						placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
						minLength={8}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder-muted transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="mt-2 inline-flex items-center justify-center rounded-2xl bg-accent px-6 py-3 text-sm font-medium text-black transition-all duration-300 hover:bg-accent-darker active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
				>
					{loading ? (
						<div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
					) : isLogin ? (
						'Sign in'
					) : (
						'Create account'
					)}
				</button>
			</form>

			{error && (
				<div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
					{error}
				</div>
			)}
		</div>
	);
}