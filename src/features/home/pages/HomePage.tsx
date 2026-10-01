import AppShell from '@/app/components/AppShell';
import WelcomeHero from '../components/WelcomeHero';
import QuickActions from '../components/QuickActions';
import RecentGraphs from '../components/RecentGraphs';
import HowItWorks from '../components/HowItWorks';

/**
 * Home / Welcome page (`/`) — the application's entry point.
 *
 * A dashboard of the primary actions, the user's most recent saved graphs and a
 * short workflow explanation. All data comes from the existing stores; every
 * action links to an existing route.
 */
export default function HomePage() {
	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
				<WelcomeHero />
				<QuickActions />
				<RecentGraphs />
				<HowItWorks />
			</div>
		</AppShell>
	);
}
