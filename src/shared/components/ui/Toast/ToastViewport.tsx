import { useToastStore } from '@/shared/store/toastStore';
import { CheckCircleFilledIcon, XIcon } from '@/shared/icons';

const toastStyles: Record<string, { icon: string; ring: string }> = {
	success: { icon: 'text-accent', ring: 'border-accent/20' },
	error: { icon: 'text-rose-400', ring: 'border-rose-500/20' },
	info: { icon: 'text-blue-400', ring: 'border-blue-400/20' },
};

const ToastViewport = () => {
	const toasts = useToastStore((s) => s.toasts);
	const dismiss = useToastStore((s) => s.dismiss);

	if (toasts.length === 0) return null;

	return (
		<div className="fixed right-4 bottom-20 z-[70] flex flex-col gap-2 sm:right-6 lg:bottom-8 sm:max-w-sm">
			{toasts.map((toast) => {
				const style = toastStyles[toast.type] ?? toastStyles.info;
				return (
					<div
						key={toast.id}
						role="status"
						className={`flex items-start gap-3 rounded-2xl border ${style.ring} bg-surface/95 px-4 py-3 shadow-overlay backdrop-blur-xl animate-toast-in`}
					>
						<CheckCircleFilledIcon size={18} className={`mt-0.5 shrink-0 ${style.icon}`} />
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<p className="text-sm font-medium text-foreground">{toast.title}</p>
							{toast.description && <p className="text-xs text-foreground/50">{toast.description}</p>}
						</div>
						<button
							onClick={() => dismiss(toast.id)}
							className="rounded-lg p-1 text-foreground/30 transition-colors hover:text-foreground"
							aria-label="Dismiss"
						>
							<XIcon size={14} />
						</button>
					</div>
				);
			})}
		</div>
	);
};

export default ToastViewport;