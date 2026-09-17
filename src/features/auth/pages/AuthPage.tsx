import { useState } from 'react';
import AuthForm from '@/features/auth/components/AuthForm';

export default function AuthPage() {
	const [isLogin, setIsLogin] = useState(true);

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16 sm:py-24">
			<div className="rounded-3xl border border-border bg-card p-8 backdrop-blur-xl sm:p-10">
				<AuthForm mode={isLogin ? 'login' : 'register'} />
			</div>

			<p className="mt-6 text-center text-sm text-foreground/40">
				{isLogin ? (
					<>
						Don&apos;t have an account?{' '}
						<button
							onClick={() => setIsLogin(false)}
							className="font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
						>
							Register
						</button>
					</>
				) : (
					<>
						Already have an account?{' '}
						<button
							onClick={() => setIsLogin(true)}
							className="font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
						>
							Sign in
						</button>
					</>
				)}
			</p>
		</div>
	);
}