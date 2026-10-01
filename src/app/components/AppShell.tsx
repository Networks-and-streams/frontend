import { useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import LanguageSwitcher from '@/shared/components/ui/LanguageSwitcher/LanguageSwitcher';
import { GraphIcon, HomeIcon, InfoIcon, LogoutIcon } from '@/shared/icons';
import { useAuthStore } from '@/features/auth/store/auth';

interface AppShellProps {
	children: React.ReactNode;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
	`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors ${
		isActive ? 'bg-muted text-foreground' : 'text-foreground/50 hover:bg-muted hover:text-foreground'
	}`;

/**
 * Application shell: shared header with the product brand, primary navigation
 * (home, workspace + about), the locale toggle and the session controls.
 *
 * The shell is also used by public pages (About), so the session controls
 * degrade to a sign-in action when no user is present.
 */
export default function AppShell({ children }: AppShellProps) {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const user = useAuthStore((s) => s.user);
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const logout = useAuthStore((s) => s.logout);

	const handleLogout = useCallback(async () => {
		await logout();
		// The router guards redirect once auth state clears.
		navigate('/auth', { replace: true });
	}, [logout, navigate]);

	const handleSignIn = useCallback(() => {
		navigate('/auth');
	}, [navigate]);

	return (
		<div className="min-h-screen bg-background">
			<header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
				<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
					<NavLink to="/" className="flex min-w-0 items-center gap-3" aria-label={t('common.appName')}>
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-accent">
							<GraphIcon size={18} />
						</span>
						<span className="hidden truncate text-base font-semibold tracking-tight text-foreground sm:block">
							{t('common.appName')}
						</span>
					</NavLink>

					<nav className="flex items-center gap-1">
						{isAuthenticated && (
							<>
								<NavLink
									to="/"
									end
									className={navLinkClass}
									title={t('common.home')}
									aria-label={t('common.home')}
								>
									<HomeIcon size={16} />
									<span className="hidden sm:inline">{t('common.home')}</span>
								</NavLink>
								<NavLink
									to="/graph"
									className={navLinkClass}
									title={t('common.workspace')}
									aria-label={t('common.workspace')}
								>
									<GraphIcon size={16} />
									<span className="hidden sm:inline">{t('common.workspace')}</span>
								</NavLink>
							</>
						)}
						<NavLink
							to="/about"
							className={navLinkClass}
							title={t('common.about')}
							aria-label={t('common.about')}
						>
							<InfoIcon size={16} />
							<span className="hidden sm:inline">{t('common.about')}</span>
						</NavLink>
					</nav>

					<div className="flex items-center gap-3">
						{user && (
							<span className="hidden max-w-[200px] truncate text-sm text-foreground/50 sm:block" title={user.email}>
								{user.email}
							</span>
						)}
						<LanguageSwitcher />
						{isAuthenticated ? (
							<Button variant="ghost" size="sm" onClick={handleLogout} aria-label={t('common.signOut')}>
								<LogoutIcon size={16} />
								<span className="hidden sm:inline">{t('common.signOut')}</span>
							</Button>
						) : (
							<Button variant="ghost" size="sm" onClick={handleSignIn}>
								{t('auth.signIn')}
							</Button>
						)}
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
		</div>
	);
}
