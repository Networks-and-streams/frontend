import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { getApiErrorMessage } from '@/shared/api/http';
import { formatDateTime, formatPrice } from '@/shared/utils/format';
import type { Payment } from '@/features/subscription/types';
import { profileApi } from '../api/profile.api';
import ProfileSection from './ProfileSection';

const STATUS_TONE: Record<string, string> = {
	SUCCEEDED: 'border-accent/30 bg-accent/10 text-accent',
	FAILED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
	CANCELLED: 'border-border bg-muted text-foreground/60',
	REFUNDED: 'border-border bg-muted text-foreground/60',
};

export default function PaymentsSection() {
	const { t } = useTranslation();
	const [payments, setPayments] = useState<Payment[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchPayments = () =>
		profileApi
			.listPayments()
			.then((list) => {
				setPayments(list);
				setError(null);
			})
			.catch((loadError) => setError(getApiErrorMessage(loadError)));

	useEffect(() => {
		void fetchPayments();
	}, []);

	return (
		<ProfileSection title={t('profile.payments.title')}>
			{error ? (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
					<span>{error}</span>
					<Button variant="ghost" size="sm" onClick={() => void fetchPayments()}>
						{t('common.retry')}
					</Button>
				</div>
			) : !payments ? (
				<p className="text-sm text-foreground/50">{t('common.loading')}</p>
			) : payments.length === 0 ? (
				<p className="text-sm text-foreground/50">{t('profile.payments.empty')}</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-[480px] text-left text-sm">
						<thead>
							<tr className="text-xs text-foreground/40">
								<th className="py-2 font-medium">{t('profile.payments.date')}</th>
								<th className="py-2 font-medium">{t('profile.payments.plan')}</th>
								<th className="py-2 font-medium">{t('profile.payments.method')}</th>
								<th className="py-2 text-right font-medium">{t('profile.payments.amount')}</th>
								<th className="py-2 text-right font-medium">{t('profile.payments.status')}</th>
							</tr>
						</thead>
						<tbody>
							{payments.map((payment) => (
								<tr key={payment.id} className="border-t border-border-subtle">
									<td className="py-2.5 text-foreground/80">{formatDateTime(payment.createdAt)}</td>
									<td className="py-2.5">{payment.plan}</td>
									<td className="py-2.5 text-foreground/70">
										{t(`profile.payments.methods.${payment.paymentMethod}`)}
									</td>
									<td className="py-2.5 text-right font-mono">{formatPrice(payment.amount, payment.currency)}</td>
									<td className="py-2.5 text-right">
										<span
											className={`rounded-full border px-2 py-0.5 text-[11px] ${
												STATUS_TONE[payment.status] ?? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
											}`}
										>
											{t(`profile.payments.statuses.${payment.status}`)}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</ProfileSection>
	);
}
