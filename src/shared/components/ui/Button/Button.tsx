interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children?: React.ReactNode;
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
	size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<string, string> = {
	primary:
		'bg-accent text-black shadow-[0_8px_24px_-10px] shadow-accent/40 hover:bg-accent-darker hover:shadow-accent/50 active:scale-[0.98]',
	secondary:
		'border border-border-subtle bg-muted text-foreground hover:bg-muted-hover hover:text-foreground active:scale-[0.98] backdrop-blur-xl',
	ghost: 'text-foreground/60 hover:text-foreground hover:bg-muted active:scale-[0.98]',
	danger:
		'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/15 active:scale-[0.98]',
};

const sizeClasses: Record<string, string> = {
	sm: 'px-3 py-1.5 text-xs rounded-xl',
	md: 'px-5 py-2.5 text-sm rounded-2xl',
	lg: 'px-7 py-3.5 text-base rounded-2xl',
};

const Button = ({ children, onClick, variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) => {
	return (
		<button
			{...props}
			onClick={onClick}
			className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
			{children}
		</button>
	);
};

export default Button;
