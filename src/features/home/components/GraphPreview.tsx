import { Suspense, lazy } from 'react';
import type { ComputeResult, GraphInput } from '@/features/graph/types';

// Same implementation the workspace uses; lazy so Cytoscape/ELK stays in its
// own chunk and is only fetched on pages that actually show a graph.
const GraphVisualization = lazy(() => import('@/features/graph/components/GraphVisualization'));

interface GraphPreviewProps {
	graph: GraphInput;
	result?: ComputeResult | null;
}

/**
 * Read-only graph preview for dashboard cards.
 *
 * A thin wrapper around the existing {@link GraphVisualization}: it reuses the
 * real Cytoscape/ELK rendering (no fake screenshots, no duplicated logic) in
 * non-interactive mode and fills its (fixed-height) parent.
 */
export default function GraphPreview({ graph, result = null }: GraphPreviewProps) {
	return (
		<Suspense fallback={<div className="h-full w-full animate-pulse bg-muted/40" />}>
			<GraphVisualization graph={graph} result={result} interactive={false} heightClassName="h-full" />
		</Suspense>
	);
}
