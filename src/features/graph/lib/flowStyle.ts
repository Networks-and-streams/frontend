import type { StylesheetJson } from 'cytoscape';
import type { GraphTheme } from './graphStyle';

/**
 * Extra stylesheet entries for the max-flow / min-cut trace overlay
 * (expansion plan §3.5).
 *
 * These selectors are appended after the base stylesheet from
 * `graphStyle.ts` so they override it where needed (saturated edges, the
 * cut, the augmenting path, the visited set and the flow edge labels).
 */
export function createFlowStylesheet(theme: GraphTheme): StylesheetJson {
	return [
		{
			// Smooth interpolation between trace frames (§3.5).
			selector: 'node, edge',
			style: {
				'transition-property': 'width, line-color, target-arrow-color, background-color, border-color, border-width',
				'transition-duration': 300,
			},
		},
		{
			// Edge label carries `flow/capacity` during a flow run; the stroke
			// width scales with the amount of flow pushed through the edge.
			selector: 'edge.flow-label',
			style: {
				'font-size': 11,
				'font-style': 'normal',
				color: theme.foreground,
				width: 'data(flowWidth)',
			},
		},
		{
			// Edge carrying its full capacity (cannot take more flow).
			selector: 'edge.saturated',
			style: {
				'line-color': theme.accentDarker,
				'target-arrow-color': theme.accentDarker,
				width: 3,
			},
		},
		{
			// Edge crossing the minimum s–t cut — red and dashed.
			selector: 'edge.cut',
			style: {
				'line-color': '#ef4444',
				'target-arrow-color': '#ef4444',
				'line-style': 'dashed',
				width: 3,
			},
		},
		{
			// The augmenting path of the displayed frame.
			selector: 'edge.active-path',
			style: {
				'line-color': theme.accent,
				'target-arrow-color': theme.accent,
				width: 4,
				'overlay-color': theme.accent,
				'overlay-opacity': 0.2,
				'overlay-padding': 4,
			},
		},
		{
			selector: 'node.source-side',
			style: {
				'background-color': '#dbeafe',
				'border-color': '#3b82f6',
				color: '#1e3a8a',
			},
		},
		{
			selector: 'node.sink-side',
			style: {
				'background-color': '#fee2e2',
				'border-color': '#ef4444',
				color: '#7f1d1d',
			},
		},
		{
			// Sink vertex marker (counterpart of the accent `node.source`).
			selector: 'node.sink',
			style: {
				'background-color': '#fee2e2',
				'border-color': '#ef4444',
				'border-width': 3,
				color: '#7f1d1d',
			},
		},
		{
			selector: 'node.active-path',
			style: {
				'border-color': theme.accent,
				'border-width': 4,
			},
		},
		{
			selector: 'node.visited',
			style: {
				'background-color': theme.accent,
				color: '#000000',
			},
		},
		{
			selector: 'node.current',
			style: {
				'border-color': '#f59e0b',
				'border-width': 4,
				'overlay-color': '#f59e0b',
				'overlay-opacity': 0.35,
				'overlay-padding': 5,
			},
		},
	];
}
