import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import SectionHeading from '@/shared/components/ui/SectionHeading/SectionHeading';
import { resolveLocale } from '@/shared/i18n';
import { DownloadIcon, FileTextIcon } from '@/shared/icons';
import { downloadAgreement, getAgreement } from '../agreement';

/**
 * "User Agreement" section.
 *
 * Renders the agreement for the active locale (structured data from
 * `features/about/agreement`) and offers a download of the complete document in
 * both Ukrainian and English. All labels come from the i18n resources; the
 * agreement body itself is a localized resource, not a hardcoded JSX string.
 */
export default function AgreementSection() {
	const { t, i18n } = useTranslation();
	const locale = resolveLocale(i18n.language);
	const agreement = getAgreement(locale);

	return (
		<section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6">
			<SectionHeading icon={<FileTextIcon size={16} />} title={t('about.agreement.title')} />

			<div className="flex flex-col gap-4">
				<p className="text-sm leading-relaxed text-foreground/50">{t('about.agreement.subtitle')}</p>

				<div className="flex flex-col gap-1 text-xs text-foreground/40 sm:flex-row sm:items-center sm:justify-between">
					<span>{agreement.versionLabel}</span>
					<span>{agreement.updatedLabel}</span>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button variant="secondary" size="sm" onClick={() => downloadAgreement('uk')}>
						<DownloadIcon size={15} />
						{t('about.agreement.download')} · {t('languageSwitcher.uk')}
					</Button>
					<Button variant="secondary" size="sm" onClick={() => downloadAgreement('en')}>
						<DownloadIcon size={15} />
						{t('about.agreement.download')} · {t('languageSwitcher.en')}
					</Button>
				</div>
			</div>

			<article className="flex flex-col gap-5 rounded-2xl border border-border/50 bg-muted/50 p-4 sm:p-5">
				<header className="flex flex-col gap-1">
					<h3 className="text-base font-semibold text-foreground">{agreement.title}</h3>
					<p className="text-xs leading-relaxed text-foreground/50">{agreement.intro}</p>
				</header>

				{agreement.sections.map((section, index) => (
					<div key={section.id} className="flex flex-col gap-2">
						<h4 className="text-sm font-semibold text-foreground">
							{index + 1}. {section.title}
						</h4>

						{section.paragraphs.map((paragraph, paragraphIndex) => (
							<p key={paragraphIndex} className="text-xs leading-relaxed text-foreground/60">
								{paragraph}
							</p>
						))}

						{section.bullets && (
							<ul className="flex flex-col gap-1.5">
								{section.bullets.map((bullet, bulletIndex) => (
									<li
										key={bulletIndex}
										className="flex items-start gap-2 text-xs leading-relaxed text-foreground/60"
									>
										<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
										{bullet}
									</li>
								))}
							</ul>
						)}
					</div>
				))}

				{agreement.footer && (
					<p className="border-t border-border-subtle pt-4 text-xs italic leading-relaxed text-foreground/40">
						{agreement.footer}
					</p>
				)}
			</article>
		</section>
	);
}
