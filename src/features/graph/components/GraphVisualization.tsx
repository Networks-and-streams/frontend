import { memo, useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import elk from 'cytoscape-elk';
import { useTranslation } from 'react-i18next';
import type { AlgorithmStep, GraphInput, SolverResult } from '../types';
import { isFlowResult } from '../types';
import type { ViewMode } from '../store/computeResultStore';
import {
	buildTraceOverlay,
	collectResultHighlight,
	elementStructureSignature,
	toCytoscapeElements,
} from '../lib/graphElements';
import { createGraphLayout, createGraphStylesheet, readGraphTheme } from '../lib/graphStyle';
import { createFlowStylesheet } from '../lib/flowStyle';

// Register the ELK layout once per module load.
cytoscape.use(elk);

interface GraphVisualizationProps {
	graph: GraphInput;
	/** Optional solver result used to highlight the computed solution. */
	result?: SolverResult | null;
	/** Currently displayed trace frame (max-flow / Minty step). */
	step?: AlgorithmStep | null;
	/** Whether flow decorations, the cut, or both are rendered. */
	viewMode?: ViewMode;
	className?: string;
	/**
	 * When false, the canvas is rendered as a static, read-only preview: no
	 * panning, zooming, box-selection or pointer events. Used by dashboard
	 * previews so they can never interfere with application state.
	 */
	interactive?: boolean;
	/** Height utility class for the container (defaults to the full editor size). */
	heightClassName?: string;
}

/**
 * Cytoscape.js graph visualization.
 *
 * The domain model (`GraphInput`) is mapped to Cytoscape elements by
 * `../lib/graphElements`; Cytoscape types never leak into the domain or the
 * Zustand stores. The instance is created once, updated incrementally (only
 * changed elements are touched, and nodes only relayout when the element set
 * changes), and destroyed on unmount.
 */
function GraphVisualization({
	graph,
	result = null,
	step = null,
	viewMode = 'both',
	className = '',
	interactive = true,
	heightClassName = 'h-[380px]',
}: GraphVisualizationProps) {
	const { t } = useTranslation();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const cyRef = useRef<Core | null>(null);
	const structureSignatureRef = useRef<string>('');

	// Element definitions — recomputed only when the graph domain object changes.
	const elements = useMemo(() => toCytoscapeElements(graph), [graph]);

	// Create the Cytoscape instance exactly once (never on re-render).
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const theme = readGraphTheme();
		const cy = cytoscape({
			container,
			style: [...createGraphStylesheet(theme), ...createFlowStylesheet(theme)],
			minZoom: 0.25,
			maxZoom: 4,
			wheelSensitivity: 0.2,
			boxSelectionEnabled: interactive,
			selectionType: 'single',
			autounselectify: !interactive,
			userZoomingEnabled: interactive,
			userPanningEnabled: interactive,
		});
		cyRef.current = cy;
		// Force a layout on the next element sync for this fresh instance.
		structureSignatureRef.current = '';

		// Keep the canvas sized to its container (responsive).
		const resizeObserver = new ResizeObserver(() => cy.resize());
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			cy.destroy();
			cyRef.current = null;
		};
	}, [interactive]);

	// Sync elements: add/remove changed elements and update data in place.
	// A layout runs only when the node/edge set changes (not for weight edits).
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;

		cy.batch(() => {
			const nextIds = new Set<string>();
			for (const definition of elements) {
				const id = String(definition.data.id);
				nextIds.add(id);
				const existing = cy.getElementById(id);
				if (existing.empty()) {
					cy.add(definition);
				} else {
					existing.data('label', String(definition.data.label ?? ''));
					existing.classes(typeof definition.classes === 'string' ? definition.classes : '');
				}
			}
			cy.elements().forEach((element) => {
				if (!nextIds.has(element.id())) element.remove();
			});
		});

		const signature = elementStructureSignature(elements);
		if (signature !== structureSignatureRef.current) {
			structureSignatureRef.current = signature;
			cy.layout(createGraphLayout()).run();
		}
	}, [elements]);

	// Highlight the computed shortest paths without moving nodes.
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;
		// Only Minty results carry `paths`; flow results are drawn by the overlay.
		const minty = result && !isFlowResult(result) ? result : null;
		const { nodeIds, edgeIds } = collectResultHighlight(graph, minty);
		cy.batch(() => {
			cy.elements('.path').removeClass('path');
			nodeIds.forEach((id) => cy.getElementById(id).addClass('path'));
			edgeIds.forEach((id) => cy.getElementById(id).addClass('path'));
		});
	}, [graph, result]);

	// Apply the trace overlay of the displayed frame (flow labels, saturated
	// edges, the cut, the augmenting path, visited/current Minty vertices).
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;

		const overlay = buildTraceOverlay(graph, result, step, viewMode);
		const isFlow = isFlowResult(result);

		cy.batch(() => {
			cy.elements().removeClass(
				'flow-label saturated cut active-path source-side sink-side visited current sink',
			);

			// Edge labels: `flow/capacity` during a flow run, the weight otherwise.
			// `flowWidth` scales the stroke with the amount of flow on the edge.
			cy.edges().forEach((edge) => {
				const id = edge.id();
				const flowLabel = overlay.edgeLabels.get(id);
				const baseLabel = edge.data('baseLabel') ?? edge.data('label');
				if (isFlow && flowLabel !== undefined) {
					const { flow, capacity } = overlay.edgeFlows.get(id) ?? { flow: 0, capacity: 0 };
					edge.data('baseLabel', baseLabel);
					edge.data('label', flowLabel);
					edge.data('flowWidth', capacity > 0 ? 1.5 + (5 * flow) / capacity : 1.5);
					edge.addClass('flow-label');
				} else if (edge.data('baseLabel') !== undefined) {
					edge.data('label', edge.data('baseLabel'));
					edge.data('flowWidth', 1.5);
				}
			});

			// Sink vertex marker of the computed flow solution.
			if (isFlow) cy.getElementById(`v${result.sink}`).addClass('sink');

			overlay.saturatedEdgeIds.forEach((id) => cy.getElementById(id).addClass('saturated'));
			overlay.cutEdgeIds.forEach((id) => cy.getElementById(id).addClass('cut'));
			overlay.activePathEdgeIds.forEach((id) => cy.getElementById(id).addClass('active-path'));
			overlay.sourceSideNodeIds.forEach((id) => cy.getElementById(id).addClass('source-side'));
			overlay.sinkSideNodeIds.forEach((id) => cy.getElementById(id).addClass('sink-side'));
			overlay.activePathNodeIds.forEach((id) => cy.getElementById(id).addClass('active-path'));
			overlay.visitedNodeIds.forEach((id) => cy.getElementById(id).addClass('visited'));
			if (overlay.currentNodeId) cy.getElementById(overlay.currentNodeId).addClass('current');
		});
	}, [graph, result, step, viewMode]);

	const ariaLabel = `${t('graphPage.canvas.ariaLabel', {
		vertices: graph.vertices,
		edges: graph.edges.length,
	})}. ${t('graphPage.canvas.source')}: ${graph.source}`;

	return (
		<div
			ref={containerRef}
			role="img"
			aria-label={ariaLabel}
			className={`${heightClassName} w-full ${interactive ? '' : 'pointer-events-none'} ${className}`}
		/>
	);
}

// Re-render only when the graph/result props actually change.
export default memo(GraphVisualization);
