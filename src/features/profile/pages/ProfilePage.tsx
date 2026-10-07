import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShell from '@/app/components/AppShell';
import Button from '@/shared/components/ui/Button/Button';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';
import { toast } from '@/shared/store/toastStore';
import { useAuthStore } from '@/features/auth/store/auth';
import { profileApi } from '../api/profile.api';
import AccountSection from '../components/AccountSection';
import DeleteAccountSection from '../components/DeleteAccountSection';
import PaymentsSection from '../components/PaymentsSection';
import DevicesSection from '../components/DevicesSection';
import PasswordSection from '../components/PasswordSection';
import SubscriptionSection from '../components/SubscriptionSection';
import type { DeviceSession, Profile } from '../types';

/** `/profile` — account details, subscription, password and signed-in devices. */
export default function ProfilePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const logout = useAuthStore((s) => s.logout);

	const [profile, setProfile] = useState<Profile | null>(null);
	const [profileError, setProfileError] = useState<string | null>(null);
	const [devices, setDevices] = useState<DeviceSession[] | null>(null);
	const [devicesError, setDevicesError] = useState<string | null>(null);
	/** Device id being signed out, or 'others'. */
	const [busyId, setBusyId] = useState<string | null>(null);

	const loadProfile = useCallback(() => {
		setProfileError(null);
		profileApi
			.getProfile()
			.then(setProfile)
			.catch((error) => setProfileError(getApiErrorMessage(error)));
	}, []);

	const loadDevices = useCallback(() => {
		setDevicesError(null);
		profileApi
			.listDevices()
			.then(setDevices)
			.catch((error) => setDevicesError(getApiErrorMessage(error)));
	}, []);

	useEffect(() => {
		loadProfile();
		loadDevices();
	}, [loadProfile, loadDevices]);

	const handleSignOut = async (device: DeviceSession) => {
		if (device.current) {
			await logout();
			navigate('/auth', { replace: true });
			return;
		}
		setBusyId(device.id);
		try {
			await profileApi.signOutDevice(device.id);
			setDevices((list) => list?.filter((d) => d.id !== device.id) ?? null);
			toast.success(t('profile.devices.signedOut'));
		} catch (error) {
			toast.error(t('profile.devices.signOutFailed'), getApiErrorMessage(error));
			loadDevices();
		} finally {
			setBusyId(null);
		}
	};

	const handleSignOutOthers = async () => {
		setBusyId('others');
		try {
			await profileApi.signOutOtherDevices();
			setDevices((list) => list?.filter((d) => d.current) ?? null);
			toast.success(t('profile.devices.othersSignedOut'));
		} catch (error) {
			toast.error(t('profile.devices.signOutFailed'), getApiErrorMessage(error));
			loadDevices();
		} finally {
			setBusyId(null);
		}
	};

	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('profile.title')}</h1>
					<p className="text-sm text-foreground/50">{t('profile.subtitle')}</p>
				</div>

				{profileError ? (
					<StateBlock
						icon={<AlertIcon size={22} />}
						title={t('profile.loadError')}
						description={profileError}
						action={
							<Button variant="secondary" size="sm" onClick={loadProfile}>
								{t('common.retry')}
							</Button>
						}
					/>
				) : !profile ? (
					<div className="h-40 animate-pulse rounded-3xl bg-muted/40" aria-label={t('common.loading')} />
				) : (
					<>
						<AccountSection profile={profile} />
						<SubscriptionSection />
						<PasswordSection
							hasPassword={profile.hasPassword}
							onChanged={() => {
								loadProfile();
								loadDevices();
							}}
						/>
						<DevicesSection
							devices={devices}
							error={devicesError}
							busyId={busyId}
							onSignOut={(device) => void handleSignOut(device)}
							onSignOutOthers={() => void handleSignOutOthers()}
							onRetry={loadDevices}
						/>
						<PaymentsSection />
						<DeleteAccountSection profile={profile} />
					</>
				)}
			</div>
		</AppShell>
	);
}
