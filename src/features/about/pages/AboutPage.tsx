import { useTranslation } from 'react-i18next';
import AppShell from '@/app/components/AppShell';
import SectionHeading from '@/shared/components/ui/SectionHeading/SectionHeading';
import { CheckIcon, GraduationIcon, HelpCircleIcon, InfoIcon, UsersIcon } from '@/shared/icons';
import { APP_FEATURE_KEYS, CONSTRAINT_KEYS, DEVELOPERS, HOW_TO_STEP_KEYS, SUPERVISOR } from '../constants';
import AgreementSection from '../components/AgreementSection';

/** Two-letter monogram (first letters of the first two name parts). */
function initials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join('');
}

/**
 * About / Help page (`/about`).
 *
 * A static, public documentation page built entirely from the shared design
 * system (AppShell, card/section tokens, icon set) — no new dependencies. All
 * copy comes from the i18n resources, so the page is fully localized
 * (EN/UK). The layout is a single responsive column that widens comfortably on
 * desktop.
 */
export default function AboutPage() {
	const { t } = useTranslation();

	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
				<header className="flex flex-col gap-2">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
						{t('about.title')}
					</h1>
					<p className="max-w-2xl text-sm leading-relaxed text-foreground/50">{t('about.subtitle')}</p>
				</header>

				{/* About the application */}
				<section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
					<SectionHeading icon={<InfoIcon size={16} />} title={t('about.app.title')} />

					<p className="text-sm leading-relaxed text-foreground/70">{t('about.app.description')}</p>

					<ul className="flex flex-col gap-3">
						{APP_FEATURE_KEYS.map((key) => (
							<li key={key} className="flex items-start gap-3 text-sm text-foreground/70">
								<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
									<CheckIcon size={12} />
								</span>
								{t(key)}
							</li>
						))}
					</ul>
				</section>

				{/* How to use */}
				<section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6">
					<SectionHeading icon={<HelpCircleIcon size={16} />} title={t('about.howTo.title')} />

					<p className="text-sm leading-relaxed text-foreground/50">{t('about.howTo.lead')}</p>

					<ol className="flex flex-col gap-4">
						{HOW_TO_STEP_KEYS.map((step, index) => (
							<li key={step} className="flex gap-4">
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-semibold text-accent">
									{index + 1}
								</span>
								<div className="flex flex-col gap-1 pt-0.5">
									<h3 className="text-sm font-semibold text-foreground">
										{t(`about.howTo.steps.${step}.title`)}
									</h3>
									<p className="text-sm leading-relaxed text-foreground/60">
										{t(`about.howTo.steps.${step}.description`)}
									</p>
								</div>
							</li>
						))}
					</ol>

					<div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-muted/50 p-4">
						<h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
							{t('about.howTo.constraints.title')}
						</h3>
						<p className="text-xs leading-relaxed text-foreground/50">{t('about.howTo.constraints.lead')}</p>
						<ul className="flex flex-col gap-2">
							{CONSTRAINT_KEYS.map((key) => (
								<li key={key} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/70">
									<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
									{t(`about.howTo.constraints.${key}`)}
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* Developers */}
				<section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6">
					<SectionHeading icon={<UsersIcon size={16} />} title={t('about.developers.title')} />

					<p className="text-sm leading-relaxed text-foreground/50">{t('about.developers.description')}</p>

					<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{DEVELOPERS.map((name) => (
							<PersonCard key={name} name={name} />
						))}
					</ul>
				</section>

				{/* Scientific supervisor */}
				<section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6">
					<SectionHeading icon={<GraduationIcon size={16} />} title={t('about.supervisor.title')} />

					<p className="text-sm leading-relaxed text-foreground/50">{t('about.supervisor.description')}</p>

					<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<PersonCard name={SUPERVISOR} />
					</ul>
				</section>

				{/* User Agreement */}
				<AgreementSection />
			</div>
		</AppShell>
	);
}

/** A single team member row: monogram + name, shared by both team sections. */
function PersonCard({ name }: { name: string }) {
	return (
		<li className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/50 p-3">
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-semibold text-accent">
				{initials(name)}
			</span>
			<span className="min-w-0 text-sm text-foreground/80">{name}</span>
		</li>
	);
}
