import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { SpinnerIcon } from '@/shared/icons';
import { formatDateTime } from '@/shared/utils/format';
import { MAX_DEVICES, type DeviceSession } from '../types';
import ProfileSection from './ProfileSection';

/** Short "Browser on OS" label from a user-agent string (best effort). */
function describeDevice(userAgent: string | undefined): string | null {
	if (!userAgent) return null;
	const browser =
		[
			['Edg/', 'Edge'],
			['OPR/', 'Opera'],
			['Firefox/', 'Firefox'],
			['Chrome/', 'Chrome'],
			['Safari/', 'Safari'],
		].find(([token]) => userAgent.includes(token))?.[1] ?? null;
	const os =
		[
			['Android', 'Android'],
			['iPhone', 'iOS'],
			['iPad', 'iPadOS'],
			['Windows', 'Windows'],
			['Mac OS X', 'macOS'],
			['Linux', 'Linux'],
		].find(([token]) => userAgent.includes(token))?.[1] ?? null;
	if (browser && os) return `${browser} · ${os}`;
	return browser ?? os ?? userAgent.slice(0, 60);
}

interface DevicesSectionProps {
	devices: DeviceSession[] | null;
	error: string | null;
	busyId: string | null;
	onSignOut: (device: DeviceSession) => void;
	onSignOutOthers: () => void;
	onRetry: () => void;
}

export default function DevicesSection({
	devices,
	error,
	busyId,
	onSignOut,
	onSignOutOthers,
	onRetry,
}: DevicesSectionProps) {
	const { t } = useTranslation();
	const hasOthers = Boolean(devices?.some((device) => !device.current));

	return (
		<ProfileSection
			title={t('profile.devices.title')}
			description={t('profile.devices.description', { max: MAX_DEVICES })}
			action={
				hasOthers && (
					<Button variant="secondary" size="sm" onClick={onSignOutOthers} disabled={busyId !== null}>
						{busyId === 'others' && <SpinnerIcon size={14} className="animate-spin" />}
						{t('profile.devices.signOutOthers')}
					</Button>
				)
			}
		>
			{error ? (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
					<span>{error}</span>
					<Button variant="ghost" size="sm" onClick={onRetry}>
						{t('common.retry')}
					</Button>
				</div>
			) : !devices ? (
				<p className="text-sm text-foreground/50">{t('common.loading')}</p>
			) : (
				<ul className="flex flex-col gap-2">
					{devices.map((device) => (
						<li
							key={device.id}
							className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${
								device.current ? 'border-accent/40 bg-accent/5' : 'border-border/50 bg-muted/50'
							}`}
						>
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="flex items-center gap-2 text-sm font-medium text-foreground">
									<span className="truncate">
										{describeDevice(device.userAgent) ?? t('profile.devices.unknown')}
									</span>
									{device.current && (
										<span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
											{t('profile.devices.thisDevice')}
										</span>
									)}
								</span>
								<span className="text-[11px] text-foreground/40">
									{t('profile.devices.signedIn', { date: formatDateTime(device.createdAt) })}
									{device.ip && ` · ${device.ip}`}
								</span>
							</div>
							<Button
								variant={device.current ? 'ghost' : 'danger'}
								size="sm"
								onClick={() => onSignOut(device)}
								disabled={busyId !== null}
							>
								{busyId === device.id && <SpinnerIcon size={14} className="animate-spin" />}
								{device.current ? t('profile.devices.signOutHere') : t('profile.devices.signOut')}
							</Button>
						</li>
					))}
				</ul>
			)}
		</ProfileSection>
	);
}
