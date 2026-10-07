import type { BaseLayoutOptions, LayoutOptions, StylesheetJson } from 'cytoscape';

/**
 * Cytoscape appearance + layout configuration.
 *
 * Kept separate from the domain layer and the component so the theme, styling
 * and layout can evolve independently (e.g. swapping ELK for another layout is
 * a change confined to this file).
 */

export interface GraphTheme {
	accent: string;
	accentDarker: string;
	foreground: string;
	surface: string;
	card: string;
	border: string;
	borderStrong: string;
}

/** Fallbacks mirror the app's light-theme CSS variables (index.css). */
const FALLBACK_THEME: GraphTheme = {
	accent: '#34d399',
	accentDarker: '#10b981',
	foreground: '#18181b',
	surface: '#f4f4f5',
	card: '#ffffff',
	border: '#e4e4e7',
	borderStrong: '#d4d4d8',
};

/**
 * Reads the app's CSS custom properties so the graph matches the current
 * theme. Cytoscape renders to a canvas and cannot resolve `var(--x)`, so the
 * values are materialized into concrete colors here.
 */
export function readGraphTheme(): GraphTheme {
	if (typeof window === 'undefined') return FALLBACK_THEME;
	const styles = getComputedStyle(document.documentElement);
	const read = (name: string, fallback: string): string => styles.getPropertyValue(name).trim() || fallback;
	return {
		accent: read('--accent', FALLBACK_THEME.accent),
		accentDarker: read('--accent-darker', FALLBACK_THEME.accentDarker),
		foreground: read('--fg', FALLBACK_THEME.foreground),
		surface: read('--surface', FALLBACK_THEME.surface),
		card: read('--card', FALLBACK_THEME.card),
		border: read('--border', FALLBACK_THEME.border),
		borderStrong: read('--border-strong', FALLBACK_THEME.borderStrong),
	};
}

export interface GraphLayoutOptions extends BaseLayoutOptions {
	animate?: boolean;
	fit?: boolean;
	padding?: number;
	nodeDimensionsIncludeLabels?: boolean;
	elk: Record<string, string | number | boolean>;
}

/**
 * ELK `layered` layout — a hierarchical layout well suited to directed graphs.
 * Cycle breaking + orthogonal edge routing keep edge crossings low.
 */
export function createGraphLayout(): GraphLayoutOptions {
	return {
		name: 'elk',
		animate: false,
		fit: true,
		padding: 28,
		nodeDimensionsIncludeLabels: true,
		elk: {
			algorithm: 'layered',
			'elk.direction': 'DOWN',
			'elk.edgeRouting': 'ORTHOGONAL',
			'elk.spacing.nodeNode': 36,
			'elk.layered.spacing.nodeNodeBetweenLayers': 56,
			'elk.spacing.edgeNode': 24,
		},
	};
}

/**
 * Layouts tried when arranging a graph, in order of preference: the drawing
 * with the fewest edge crossings wins and ties keep the earlier one, so the
 * hierarchical layout stays the default whenever it is as good as the others.
 */
export function createLayoutCandidates(): LayoutOptions[] {
	const base = createGraphLayout();
	const elk = (overrides: Record<string, string | number | boolean>) =>
		({ ...base, fit: false, elk: { ...base.elk, ...overrides } }) as unknown as LayoutOptions;
	return [
		elk({}),
		elk({ 'elk.direction': 'RIGHT' }),
		elk({ algorithm: 'stress', 'elk.stress.desiredEdgeLength': 90 }),
		elk({ algorithm: 'force', 'elk.force.iterations': 400 }),
		{ name: 'cose', animate: false, fit: false, randomize: true, nodeDimensionsIncludeLabels: true } as LayoutOptions,
		{ name: 'circle', animate: false, fit: false } as LayoutOptions,
	];
}

/** Cytoscape stylesheet mirroring the previous SVG look (nodes, weights, source, highlights). */
export function createGraphStylesheet(theme: GraphTheme): StylesheetJson {
	return [
		{
			selector: 'node',
			style: {
				'background-color': theme.surface,
				'border-color': theme.borderStrong,
				'border-width': 1.5,
				width: 34,
				height: 34,
				label: 'data(label)',
				color: theme.foreground,
				'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
				'font-size': 13,
				'font-weight': 600,
				'text-valign': 'center',
				'text-halign': 'center',
			},
		},
		{
			// Source vertex styling — same accent treatment as the previous SVG.
			selector: 'node.source',
			style: {
				'background-color': theme.accent,
				'border-color': theme.accentDarker,
				color: '#000000',
			},
		},
		{
			selector: 'node.path',
			style: {
				'border-color': theme.accent,
				'border-width': 3,
			},
		},
		{
			// Step playback: node label shows "vertex\ndistance".
			selector: 'node.traced',
			style: {
				'text-wrap': 'wrap',
				'line-height': 1.1,
				'font-size': 11,
				width: 42,
				height: 42,
			},
		},
		{
			selector: 'node.step-frontier',
			style: {
				'border-color': theme.accent,
				'border-style': 'dashed',
				'border-width': 2,
			},
		},
		{
			selector: 'node.step-visited',
			style: {
				'background-color': theme.accent,
				'background-opacity': 0.35,
				'border-color': theme.accentDarker,
				'border-style': 'solid',
				'border-width': 2,
			},
		},
		{
			selector: 'node.step-improved',
			style: {
				'border-color': '#f59e0b',
				'border-style': 'solid',
				'border-width': 3,
			},
		},
		{
			selector: 'node.step-current',
			style: {
				'background-color': theme.accent,
				'background-opacity': 1,
				'border-color': theme.foreground,
				'border-style': 'solid',
				'border-width': 3,
				color: '#000000',
				'overlay-color': theme.accent,
				'overlay-opacity': 0.25,
				'overlay-padding': 6,
			},
		},
		{
			// Visual editor: the node an edge is being drawn from.
			selector: 'node.connect-from',
			style: {
				'border-color': theme.accent,
				'border-width': 3,
				'border-style': 'dashed',
			},
		},
		{
			selector: 'node:selected',
			style: {
				'border-color': theme.accent,
				'border-width': 4,
				'overlay-color': theme.accent,
				'overlay-opacity': 0.15,
			},
		},
		{
			selector: 'edge',
			style: {
				width: 1.5,
				'line-color': theme.borderStrong,
				'curve-style': 'bezier',
				'target-arrow-color': theme.borderStrong,
				'target-arrow-shape': 'triangle',
				'arrow-scale': 1,
				label: 'data(label)',
				color: theme.foreground,
				'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
				'font-size': 11,
				'text-rotation': 'autorotate',
				'text-margin-y': -2,
				'text-background-color': theme.card,
				'text-background-opacity': 1,
				'text-background-shape': 'roundrectangle',
				'text-background-padding': '2px',
				'text-border-color': theme.border,
				'text-border-width': 1,
				'text-border-opacity': 1,
			},
		},
		{
			selector: 'edge.path',
			style: {
				'line-color': theme.accent,
				'target-arrow-color': theme.accent,
				width: 3,
			},
		},
		{
			selector: 'edge.step-relaxed',
			style: {
				'line-color': '#f59e0b',
				'target-arrow-color': '#f59e0b',
				width: 3,
			},
		},
		{
			selector: 'edge:selected',
			style: {
				'line-color': theme.accent,
				'target-arrow-color': theme.accent,
				width: 3,
			},
		},
	];
}
