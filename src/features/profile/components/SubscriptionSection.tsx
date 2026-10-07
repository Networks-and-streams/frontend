import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/shared/utils/format';
import { useSubscriptionStore } from '@/features/subscription/store/subscriptionStore';
import { isActiveSubscription } from '@/features/subscription/types';
import { graphApi } from '@/features/graph/api/graph.api';
import type { ComputeQuota } from '@/features/graph/types';
import ProfileSection, { DetailRow } from './ProfileSection';

/** Plan, status and term from GET /subscriptions/me, plus today's run allowance. */
export default function SubscriptionSection() {
	const { t } = useTranslation();
	const subscription = useSubscriptionStore((s) => s.subscription);
	const loadState = useSubscriptionStore((s) => s.loadState);
	const active = isActiveSubscription(subscription);
	const [quota, setQuota] = useState<ComputeQuota | null>(null);

	useEffect(() => {
		graphApi
			.getQuota()
			.then(setQuota)
			.catch(() => setQuota(null));
	}, []);

	return (
		<ProfileSection
			title={t('profile.subscription.title')}
			action={
				!active && (
					<Link
						to="/subscribe"
						className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
					>
						{t('profile.subscription.upgrade')}
					</Link>
				)
			}
		>
			{loadState !== 'ready' && !subscription ? (
				<p className="text-sm text-foreground/50">
					{loadState === 'error' ? t('profile.subscription.loadError') : t('common.loading')}
				</p>
			) : (
				<dl>
					<DetailRow label={t('profile.subscription.plan')}>
						<span
							className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
								active
									? 'border-accent/30 bg-accent/10 text-accent'
									: 'border-border bg-muted text-foreground/70'
							}`}
						>
							{active ? t('profile.subscription.premium') : t('profile.subscription.free')}
						</span>
					</DetailRow>
					{subscription && (
						<DetailRow label={t('profile.subscription.status')}>
							{t(`profile.subscription.statuses.${subscription.status}`)}
						</DetailRow>
					)}
					{active && subscription?.startedAt && (
						<DetailRow label={t('profile.subscription.startedAt')}>{formatDateTime(subscription.startedAt)}</DetailRow>
					)}
					{active && subscription?.expiresAt && (
						<DetailRow label={t('profile.subscription.expiresAt')}>{formatDateTime(subscription.expiresAt)}</DetailRow>
					)}
					{quota && (
						<DetailRow label={t('profile.subscription.runsToday')}>
							{quota.unlimited
								? t('profile.subscription.unlimited')
								: t('profile.subscription.runsLeft', { remaining: quota.remaining, limit: quota.limit })}
						</DetailRow>
					)}
				</dl>
			)}
		</ProfileSection>
	);
}
