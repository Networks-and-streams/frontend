/** Section header: framed icon + uppercase caption, matching the app's cards. */
export default function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-2.5">
			<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-accent">
				{icon}
			</span>
			<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">{title}</h2>
		</div>
	);
}
