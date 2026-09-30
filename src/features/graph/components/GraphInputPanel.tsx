import { useState } from 'react';
import Button from '@/shared/components/ui/Button/Button';
import { SAMPLE_GRAPH, isValidGraph, type GraphInput } from '../types';

interface GraphInputPanelProps {
	value: GraphInput;
	onChange: (graph: GraphInput) => void;
	onInvalid?: (message: string) => void;
}

/** Interactive table-based editor for the graph definition with validation. */
export default function GraphInputPanel({ value, onChange, onInvalid }: GraphInputPanelProps) {
	const [error, setError] = useState<string | null>(null);

	const runError = (message: string) => {
		setError(message);
		onInvalid?.(message);
	};

	const validateAndChange = (nextGraph: GraphInput) => {
		if (!isValidGraph(nextGraph)) {
			runError('Invalid graph: vertices ≥ 1, source within 1..vertices, edge endpoints within range.');
		} else {
			setError(null);
		}
		onChange(nextGraph);
	};

	const handleVerticesChange = (vertices: number) => {
		validateAndChange({
			...value,
			vertices: Math.max(1, vertices),
		});
	};

	const handleSourceChange = (source: number) => {
		validateAndChange({
			...value,
			source: Math.max(1, source),
		});
	};

	const addEdge = () => {
		validateAndChange({
			...value,
			edges: [...value.edges, { from: 1, to: Math.min(2, value.vertices), weight: 1 }],
		});
	};

	const updateEdge = (index: number, field: 'from' | 'to' | 'weight', val: number) => {
		const newEdges = [...value.edges];
		newEdges[index] = {
			...newEdges[index],
			[field]: val,
		};
		validateAndChange({
			...value,
			edges: newEdges,
		});
	};

	const removeEdge = (index: number) => {
		validateAndChange({
			...value,
			edges: value.edges.filter((_, i) => i !== index),
		});
	};

	const loadExample = () => {
		setError(null);
		onChange(SAMPLE_GRAPH);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
					Graph input
				</h2>
				<Button variant="ghost" size="sm" onClick={loadExample}>
					Load example
				</Button>
			</div>

			{/* Настройки вершин и стартовой ноды */}
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-foreground/50">Vertices count</label>
					<input
						type="number"
						min={1}
						value={value.vertices}
						onChange={(e) => handleVerticesChange(Number(e.target.value))}
						className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-foreground/50">Source vertex</label>
					<input
						type="number"
						min={1}
						max={value.vertices}
						value={value.source}
						onChange={(e) => handleSourceChange(Number(e.target.value))}
						className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
					/>
				</div>
			</div>

			{/* Список ребер */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs uppercase tracking-[0.2em] text-foreground/40">Edges</span>
					<Button variant="ghost" size="sm" onClick={addEdge} className="text-xs text-accent">
						+ Add edge
					</Button>
				</div>

				<div className="max-h-[240px] overflow-auto space-y-2 pr-1">
					{value.edges.map((edge, idx) => (
						<div
							key={idx}
							className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/50 p-2.5"
						>
							<span className="text-xs font-mono text-foreground/30 w-6 text-center">#{idx + 1}</span>
							<div className="flex flex-col gap-0.5 flex-1">
								<span className="text-[10px] text-foreground/40 px-1">From</span>
								<input
									type="number"
									min={1}
									max={value.vertices}
									value={edge.from}
									onChange={(e) => updateEdge(idx, 'from', Number(e.target.value))}
									className="rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-center font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/20"
								/>
							</div>
							<div className="flex flex-col gap-0.5 flex-1">
								<span className="text-[10px] text-foreground/40 px-1">To</span>
								<input
									type="number"
									min={1}
									max={value.vertices}
									value={edge.to}
									onChange={(e) => updateEdge(idx, 'to', Number(e.target.value))}
									className="rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-center font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/20"
								/>
							</div>
							<div className="flex flex-col gap-0.5 flex-1">
								<span className="text-[10px] text-foreground/40 px-1">Weight</span>
								<input
									type="number"
									value={edge.weight}
									onChange={(e) => updateEdge(idx, 'weight', Number(e.target.value))}
									className="rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-center font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent/20"
								/>
							</div>
							<button
								onClick={() => removeEdge(idx)}
								className="mt-4 p-1.5 text-foreground/40 hover:text-rose-400 transition-colors"
								title="Remove edge"
							>
								✕
							</button>
						</div>
					))}
				</div>
			</div>

			{error && (
				<p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
					{error}
				</p>
			)}
		</div>
	);
}
