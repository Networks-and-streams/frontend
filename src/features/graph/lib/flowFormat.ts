import type { FlowEdgeResult } from '../types';

/** Percentage of the capacity currently used by the flow on an edge. */
export function flowPercent(edge: Pick<FlowEdgeResult, 'flow' | 'capacity'>): number {
	if (edge.capacity <= 0) return 0;
	return Math.round((edge.flow / edge.capacity) * 100);
}
