import { useMemo } from 'react';
import type { GraphEdge, GraphInput } from '../types';

interface GraphCanvasProps {
	graph: GraphInput;
	className?: string;
}

const VIEW_W = 560;
const VIEW_H = 380;
const PADDING = 46;

interface Point {
	x: number;
	y: number;
}

function layoutNodes(vertices: number): Point[] {
	const cx = VIEW_W / 2;
	const cy = VIEW_H / 2;
	const radius = Math.max(PADDING, Math.min(VIEW_W, VIEW_H) / 2 - PADDING);

	return Array.from({ length: vertices }, (_, i) => {
		const angle = (2 * Math.PI * i) / Math.max(vertices, 1) - Math.PI / 2;
		return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
	});
}

function midPoint(a: Point, b: Point): Point {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function EdgeLine({ edge, from, to }: { edge: GraphEdge; from: Point; to: Point }) {
	if (edge.from === edge.to) {
		// Self-loop: render a small loop above the node.
		const rx = Math.max(16, Math.abs(to.x - from.x) * 0.2);
		const d = `M ${from.x} ${from.y - 14} a ${rx} 18 0 1 0 0.1 0`;
		return <path d={d} fill="none" stroke="var(--border-strong)" strokeWidth={1.5} />;
	}

	const mid = midPoint(from, to);

	return (
		<g>
			<line
				x1={from.x}
				y1={from.y}
				x2={to.x}
				y2={to.y}
				stroke="var(--border-strong)"
				strokeWidth={1.5}
				markerEnd="url(#graph-arrow)"
			/>
			<g transform={`translate(${mid.x}, ${mid.y})`}>
				<circle r={11} fill="var(--surface)" stroke="var(--border)" />
				<text textAnchor="middle" dominantBaseline="central" fontSize={11} fill="var(--fg)">
					{edge.weight}
				</text>
			</g>
		</g>
	);
}

/**
 * Lightweight SVG visualization of the graph. Nodes are laid out on a circle;
 * edge direction is shown with an arrow marker. Pure presentational — no
 * compute integration.
 */
export default function GraphCanvas({ graph, className = '' }: GraphCanvasProps) {
	const nodes = useMemo(() => layoutNodes(graph.vertices), [graph.vertices]);

	return (
		<svg
			viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
			role="img"
			aria-label={`Graph with ${graph.vertices} vertices and ${graph.edges.length} edges`}
			className={`h-auto w-full ${className}`}
		>
			<defs>
				<marker id="graph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-strong)" />
				</marker>
			</defs>

			{graph.edges.map((edge, i) => {
				const from = nodes[edge.from - 1];
				const to = nodes[edge.to - 1];
				if (!from || !to) return null;
				return <EdgeLine key={`${edge.from}-${edge.to}-${i}`} edge={edge} from={from} to={to} />;
			})}

			{nodes.map((node, i) => {
				const index = i + 1;
				const isSource = index === graph.source;
				return (
					<g key={index} transform={`translate(${node.x}, ${node.y})`}>
						<circle
							r={17}
							fill={isSource ? 'var(--accent)' : 'var(--surface)'}
							stroke={isSource ? 'var(--accent-darker)' : 'var(--border-strong)'}
							strokeWidth={1.5}
						/>
						<text
							textAnchor="middle"
							dominantBaseline="central"
							fontSize={13}
							fontWeight={600}
							fill={isSource ? 'black' : 'var(--fg)'}
						>
							{index}
						</text>
						{isSource && (
							<text y={-26} textAnchor="middle" fontSize={10} fill="var(--accent)" fontWeight={600}>
								source
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}