import { i18n } from '@/shared/i18n';
import { isValidGraph, parseGraph, type GraphEdge, type GraphInput } from '../types';

/**
 * Graph files: import from and export to the user's disk.
 *
 * Two import formats are accepted:
 * - JSON — the app's own format `{ "vertices", "source", "edges": [{ "from", "to", "weight" }] }`
 *   (what {@link downloadGraph} writes).
 * - Edge list (.txt / .csv) — one edge per line, `from to [weight]` separated by
 *   spaces, tabs, commas or semicolons; weight defaults to 1. Optional lines
 *   `vertices N` and `source N`; `#` starts a comment. Without `vertices`, the
 *   highest vertex number used is the count; without `source`, it is 1.
 */

export const GRAPH_FILE_ACCEPT = '.json,.txt,.csv,application/json,text/plain,text/csv';

const MAX_FILE_BYTES = 1024 * 1024;

export async function readGraphFile(file: File): Promise<GraphInput> {
	if (file.size > MAX_FILE_BYTES) throw new Error(i18n.t('graphPage.file.errors.tooLarge'));
	return parseGraphText(await file.text());
}

export function parseGraphText(text: string): GraphInput {
	const trimmed = text.replace(/^\uFEFF/, '').trim();
	if (!trimmed) throw new Error(i18n.t('graphPage.file.errors.empty'));

	const graph = trimmed.startsWith('{') ? parseJson(trimmed) : parseEdgeList(trimmed);
	if (!isValidGraph(graph)) throw new Error(i18n.t('graphPage.file.errors.invalid'));
	return graph;
}

function parseJson(text: string): GraphInput {
	try {
		const graph = parseGraph(text);
		return {
			vertices: graph.vertices,
			source: graph.source,
			// Copy only known fields so stray keys never reach the backend.
			edges: graph.edges.map((e) => ({ from: e.from, to: e.to, weight: e.weight })),
		};
	} catch {
		throw new Error(i18n.t('graphPage.file.errors.json'));
	}
}

function parseEdgeList(text: string): GraphInput {
	const edges: GraphEdge[] = [];
	let declaredVertices: number | null = null;
	let source = 1;

	text.split(/\r?\n/).forEach((rawLine, i) => {
		const line = rawLine.replace(/#.*/, '').trim();
		if (!line) return;
		const parts = line.split(/[\s,;]+/);
		const keyword = parts[0].toLowerCase();

		if (keyword === 'vertices' || keyword === 'source') {
			const value = Number(parts[1]);
			if (parts.length !== 2 || !Number.isInteger(value)) throw lineError(i + 1);
			if (keyword === 'vertices') declaredVertices = value;
			else source = value;
			return;
		}

		const numbers = parts.map(Number);
		if ((numbers.length !== 2 && numbers.length !== 3) || numbers.some((n) => !Number.isFinite(n))) {
			throw lineError(i + 1);
		}
		edges.push({ from: numbers[0], to: numbers[1], weight: numbers[2] ?? 1 });
	});

	// A reduce, not Math.max(...spread): large files would overflow the call stack.
	const highest = edges.reduce((max, e) => Math.max(max, e.from, e.to), source);
	return { vertices: declaredVertices ?? highest, source, edges };
}

function lineError(line: number): Error {
	return new Error(i18n.t('graphPage.file.errors.line', { line }));
}

/** Downloads a graph as a JSON file that {@link readGraphFile} can import again. */
export function downloadGraph(name: string, graph: GraphInput): void {
	const json = JSON.stringify({ vertices: graph.vertices, source: graph.source, edges: graph.edges }, null, 2);
	const blob = new Blob([json, '\n'], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = `${fileSafeName(name) || 'graph'}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();

	URL.revokeObjectURL(url);
}

/** Graph name from an imported file name ("my graph.json" → "my graph"). */
export function graphNameFromFile(fileName: string): string {
	return fileName.replace(/\.[^.]+$/, '').slice(0, 120);
}

function fileSafeName(name: string): string {
	return name.trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);
}
