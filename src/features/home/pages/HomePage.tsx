import AppShell from '@/app/components/AppShell';
import WelcomeHero from '../components/WelcomeHero';
import FeaturePreviews from '../components/FeaturePreviews';
import RecentGraphs from '../components/RecentGraphs';
import HowItWorks from '../components/HowItWorks';

/**
 * Home / Welcome page (`/`) — the application's entry point.
 *
 * Visual hierarchy: welcome hero → main feature previews → recent saved graphs
 * → how it works. All data comes from the existing stores; every action links
 * to an existing route and previews are read-only.
 */
export default function HomePage() {
	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
				<WelcomeHero />
				<FeaturePreviews />
				<RecentGraphs />
				<HowItWorks />
			</div>
		</AppShell>
	);
}
