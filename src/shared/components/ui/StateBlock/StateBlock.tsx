interface StateBlockProps {
	icon?: React.ReactNode;
	title?: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}

const StateBlock = ({ icon, title, description, action, className = '' }: StateBlockProps) => {
	return (
		<div className={`flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border py-16 px-6 text-center animate-fade-in ${className}`}>
			{icon && (
				<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted text-foreground/40">
					{icon}
				</div>
			)}
			{(title || description) && (
				<div className="flex flex-col gap-1.5">
					{title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
					{description && <p className="max-w-sm text-sm leading-relaxed text-foreground/40">{description}</p>}
				</div>
			)}
			{action}
		</div>
	);
};

export default StateBlock;
