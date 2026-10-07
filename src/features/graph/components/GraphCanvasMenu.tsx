import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface CanvasPoint {
	x: number;
	y: number;
}

export interface CanvasMenuItem<Id extends string = string> {
	id: Id;
	label: string;
	disabled?: boolean;
	danger?: boolean;
}

export const MENU_WIDTH = 190;
export const WEIGHT_EDITOR_WIDTH = 150;

/** Closes on Escape or on a pointer press outside the panel. */
function useDismiss(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		const onPointer = (e: PointerEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('pointerdown', onPointer);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('pointerdown', onPointer);
		};
	}, [ref, onClose]);
}

const panelClass =
	'absolute z-20 rounded-xl border border-border bg-card p-1 shadow-xl shadow-black/20 backdrop-blur-xl';

/** Context menu of the visual graph editor. */
export function GraphCanvasMenu<Id extends string>({
	at,
	title,
	items,
	onSelect,
	onClose,
}: {
	/** Already clamped to the canvas by the caller. */
	at: CanvasPoint;
	title: string;
	items: CanvasMenuItem<Id>[];
	onSelect: (id: Id) => void;
	onClose: () => void;
}) {
	const ref = useRef<HTMLDivElement | null>(null);
	useDismiss(ref, onClose);

	// Move focus into the menu so it is usable from the keyboard.
	useEffect(() => {
		ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
	}, []);

	return (
		<div ref={ref} role="menu" aria-label={title} className={panelClass} style={{ left: at.x, top: at.y, width: MENU_WIDTH }}>
			<p className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-[0.15em] text-foreground/40">{title}</p>
			{items.map((item) => (
				<button
					key={item.id}
					type="button"
					role="menuitem"
					disabled={item.disabled}
					onClick={() => {
						onClose();
						onSelect(item.id);
					}}
					className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
						item.danger
							? 'text-rose-400 hover:bg-rose-500/10 focus-visible:bg-rose-500/10'
							: 'text-foreground hover:bg-muted focus-visible:bg-muted'
					}`}
				>
					{item.label}
				</button>
			))}
		</div>
	);
}

/** Inline editor for an edge weight (non-negative integer). */
export function EdgeWeightEditor({
	at,
	label,
	submitLabel,
	initial,
	onCommit,
	onClose,
}: {
	at: CanvasPoint;
	label: string;
	submitLabel: string;
	initial: number;
	onCommit: (weight: number) => void;
	onClose: () => void;
}) {
	const ref = useRef<HTMLFormElement | null>(null);
	const [value, setValue] = useState(String(initial));
	const weight = Number(value);
	const valid = value.trim() !== '' && Number.isInteger(weight) && weight >= 0;
	useDismiss(ref, onClose);

	return (
		<form
			ref={ref}
			className={`${panelClass} flex items-center gap-1.5 p-2`}
			style={{ left: at.x, top: at.y, width: WEIGHT_EDITOR_WIDTH }}
			onSubmit={(e) => {
				e.preventDefault();
				if (!valid) return;
				onCommit(weight);
				onClose();
			}}
		>
			<label className="sr-only" htmlFor="edge-weight-input">
				{label}
			</label>
			<input
				id="edge-weight-input"
				type="number"
				min={0}
				step={1}
				autoFocus
				value={value}
				onChange={(e) => setValue(e.target.value)}
				aria-invalid={!valid}
				className="h-8 w-20 rounded-lg border border-border bg-muted px-2 text-center font-mono text-sm text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
			/>
			<button
				type="submit"
				disabled={!valid}
				className="h-8 rounded-lg bg-accent px-2.5 text-xs font-semibold text-black disabled:opacity-40"
			>
				{submitLabel}
			</button>
		</form>
	);
}

export function CanvasHint({ children }: { children: ReactNode }) {
	return <p className="px-1 pt-2 text-[11px] leading-relaxed text-foreground/40">{children}</p>;
}
