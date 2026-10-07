import type { ReactNode } from 'react';

/** Card wrapper shared by the profile page sections. */
export default function ProfileSection({
	title,
	description,
	action,
	children,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">{title}</h2>
					{description && <p className="text-sm text-foreground/50">{description}</p>}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

/** Label/value row used for read-only details. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5 border-b border-border-subtle py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
			<dt className="text-xs text-foreground/50">{label}</dt>
			<dd className="text-sm text-foreground sm:text-right">{children}</dd>
		</div>
	);
}
