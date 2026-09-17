import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/shared/components/ui/Button/Button';
import { GraphIcon, LogoutIcon } from '@/shared/icons';
import { useAuthStore } from '@/features/auth/store/auth';

interface AppShellProps {
	children: React.ReactNode;
}

/**
 * Application shell: shared header with the product brand and the
 * authenticated user's session controls. Used by the subscription and
 * graph-resolver pages.
 */
export default function AppShell({ children }: AppShellProps) {
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user);
	const logout = useAuthStore((s) => s.logout);

	const handleLogout = useCallback(async () => {
		await logout();
		// The router guards redirect once auth state clears.
		navigate('/auth', { replace: true });
	}, [logout, navigate]);

	return (
		<div className="min-h-screen bg-background">
			<header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
				<div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
					<div className="flex items-center gap-3">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-accent">
							<GraphIcon size={18} />
						</span>
						<span className="text-base font-semibold tracking-tight text-foreground">
							Graph Resolver
						</span>
					</div>

					<div className="flex items-center gap-3">
						{user && (
							<span className="hidden max-w-[200px] truncate text-sm text-foreground/50 sm:block" title={user.email}>
								{user.email}
							</span>
						)}
						<Button variant="ghost" size="sm" onClick={handleLogout}>
							<LogoutIcon size={16} />
							Sign out
						</Button>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
		</div>
	);
}