import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { EdgeMetric, GraphEdge } from '../types';

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
export const EDGE_EDITOR_WIDTH = 220;

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

// Opaque surface: the panel floats over the canvas, a translucent card would be unreadable.
const panelClass =
	'absolute z-20 rounded-xl border border-border-strong bg-surface p-1 text-foreground shadow-2xl shadow-black/40';

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

/**
 * Inline editor for an edge: its weight (non-negative integer) and the
 * graph's extra parameters (any number; empty = no data).
 */
export function EdgeEditor({
	at,
	title,
	submitLabel,
	weightLabel,
	edge,
	metrics,
	onCommit,
	onClose,
}: {
	at: CanvasPoint;
	title: string;
	submitLabel: string;
	weightLabel: string;
	edge: GraphEdge;
	metrics: EdgeMetric[];
	onCommit: (edge: GraphEdge) => void;
	onClose: () => void;
}) {
	const ref = useRef<HTMLFormElement | null>(null);
	const [weightText, setWeightText] = useState(String(edge.weight));
	const [valueTexts, setValueTexts] = useState<Record<string, string>>(() =>
		Object.fromEntries(metrics.map((m) => [m.key, edge.values?.[m.key] !== undefined ? String(edge.values[m.key]) : ''])),
	);
	useDismiss(ref, onClose);

	const weight = Number(weightText);
	const weightValid = weightText.trim() !== '' && Number.isInteger(weight) && weight >= 0;
	const valuesValid = metrics.every((m) => {
		const text = valueTexts[m.key]?.trim() ?? '';
		return text === '' || Number.isFinite(Number(text));
	});
	const valid = weightValid && valuesValid;

	const fieldClass =
		'h-8 w-full rounded-lg border border-border bg-muted px-2 text-center font-mono text-sm text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20';

	return (
		<form
			ref={ref}
			aria-label={title}
			className={`${panelClass} flex flex-col gap-2 p-2.5`}
			style={{ left: at.x, top: at.y, width: EDGE_EDITOR_WIDTH }}
			onSubmit={(e) => {
				e.preventDefault();
				if (!valid) return;
				const values: Record<string, number> = {};
				for (const m of metrics) {
					const text = valueTexts[m.key]?.trim() ?? '';
					if (text !== '') values[m.key] = Number(text);
				}
				onCommit({ from: edge.from, to: edge.to, weight, ...(Object.keys(values).length > 0 && { values }) });
				onClose();
			}}
		>
			<p className="px-0.5 text-[11px] uppercase tracking-[0.15em] text-foreground/40">{title}</p>
			<label className="grid grid-cols-[1fr_5.5rem] items-center gap-2 text-xs text-foreground/70">
				{weightLabel}
				<input
					type="number"
					min={0}
					step={1}
					autoFocus
					value={weightText}
					onChange={(e) => setWeightText(e.target.value)}
					aria-invalid={!weightValid}
					className={fieldClass}
				/>
			</label>
			{metrics.map((m) => (
				<label key={m.key} className="grid grid-cols-[1fr_5.5rem] items-center gap-2 text-xs text-foreground/70">
					<span className="truncate" title={m.name}>
						{m.name}
					</span>
					<input
						type="number"
						step="any"
						placeholder="—"
						value={valueTexts[m.key] ?? ''}
						onChange={(e) => setValueTexts((texts) => ({ ...texts, [m.key]: e.target.value }))}
						className={fieldClass}
					/>
				</label>
			))}
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
