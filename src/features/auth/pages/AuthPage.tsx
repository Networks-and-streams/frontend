import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthForm from '@/features/auth/components/AuthForm';
import LanguageSwitcher from '@/shared/components/ui/LanguageSwitcher/LanguageSwitcher';

export default function AuthPage() {
	const { t } = useTranslation();
	const [isLogin, setIsLogin] = useState(true);

	return (
		<div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16 sm:py-24">
			<div className="absolute right-4 top-4 sm:right-6 sm:top-6">
				<LanguageSwitcher variant="page" />
			</div>

			<div className="rounded-3xl border border-border bg-card p-8 backdrop-blur-xl sm:p-10">
				<AuthForm mode={isLogin ? 'login' : 'register'} />
			</div>

			<p className="mt-6 text-center text-sm text-foreground/40">
				{isLogin ? (
					<>
						{t('auth.noAccount')}{' '}
						<button
							onClick={() => setIsLogin(false)}
							className="font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
						>
							{t('auth.register')}
						</button>
					</>
				) : (
					<>
						{t('auth.haveAccount')}{' '}
						<button
							onClick={() => setIsLogin(true)}
							className="font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
						>
							{t('auth.signIn')}
						</button>
					</>
				)}
			</p>
		</div>
	);
}