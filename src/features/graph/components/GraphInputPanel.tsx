import { useEffect, useState } from 'react';
import Button from '@/shared/components/ui/Button/Button';
import { SAMPLE_GRAPH, isValidGraph, parseGraph, type GraphInput } from '../types';

interface GraphInputPanelProps {
	value: GraphInput;
	onChange: (graph: GraphInput) => void;
	onInvalid?: (message: string) => void;
}

/** Editable JSON editor for the graph definition with validation. */
export default function GraphInputPanel({ value, onChange, onInvalid }: GraphInputPanelProps) {
	const [text, setText] = useState(() => JSON.stringify(value, null, 2));
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const next = JSON.stringify(value, null, 2);
		if (next !== text) setText(next);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	const runError = (message: string) => {
		setError(message);
		onInvalid?.(message);
	};

	const apply = () => {
		try {
			const parsed = parseGraph(text);
			if (!isValidGraph(parsed)) {
				runError('Invalid graph: vertices ≥ 1, source within 1..vertices, edge endpoints within range.');
				return;
			}
			setError(null);
			onChange(parsed);
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'Cannot parse the graph JSON.';
			runError(message);
		}
	};

	const loadExample = () => {
		setError(null);
		setText(JSON.stringify(SAMPLE_GRAPH, null, 2));
		onChange(SAMPLE_GRAPH);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
					Graph input
				</h2>
				<Button variant="ghost" size="sm" onClick={loadExample}>
					Load example
				</Button>
			</div>

			<textarea
				value={text}
				onChange={(e) => {
					setText(e.target.value);
					setError(null);
				}}
				spellCheck={false}
				aria-label="Graph JSON"
				className="min-h-[240px] w-full resize-y rounded-2xl border border-border bg-muted p-4 font-mono text-xs leading-relaxed text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
			/>

			{error && (
				<p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
					{error}
				</p>
			)}

			<Button variant="secondary" size="sm" onClick={apply} className="self-start">
				Apply graph
			</Button>
		</div>
	);
}