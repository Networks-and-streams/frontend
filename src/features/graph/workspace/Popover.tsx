import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * A button that opens a floating panel below it. Closes on Escape, on a
 * press outside, or when the content calls `close`.
 */
export default function Popover({
	label,
	buttonClassName,
	title,
	align = 'left',
	panelClassName = 'w-72',
	children,
}: {
	label: ReactNode;
	buttonClassName: string;
	title?: string;
	align?: 'left' | 'right';
	panelClassName?: string;
	children: (close: () => void) => ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const panelId = useId();

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		const onPointer = (e: PointerEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('pointerdown', onPointer);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('pointerdown', onPointer);
		};
	}, [open]);

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				title={title}
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => setOpen(!open)}
				className={buttonClassName}
			>
				{label}
			</button>
			{open && (
				<div
					id={panelId}
					className={`absolute top-full z-30 mt-2 rounded-2xl border border-border-strong bg-surface p-2 text-foreground shadow-2xl shadow-black/40 ${
						align === 'right' ? 'right-0' : 'left-0'
					} ${panelClassName}`}
				>
					{children(() => setOpen(false))}
				</div>
			)}
		</div>
	);
}
