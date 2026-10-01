import { memo, useEffect, useMemo, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import elk from 'cytoscape-elk';
import { useTranslation } from 'react-i18next';
import type { ComputeResult, GraphInput } from '../types';
import {
	collectResultHighlight,
	elementStructureSignature,
	toCytoscapeElements,
} from '../lib/graphElements';
import { createGraphLayout, createGraphStylesheet, readGraphTheme } from '../lib/graphStyle';

// Register the ELK layout once per module load.
cytoscape.use(elk);

interface GraphVisualizationProps {
	graph: GraphInput;
	/** Optional solver result used to highlight the computed shortest paths. */
	result?: ComputeResult | null;
	className?: string;
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
function GraphVisualization({ graph, result = null, className = '' }: GraphVisualizationProps) {
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

		const cy = cytoscape({
			container,
			style: createGraphStylesheet(readGraphTheme()),
			minZoom: 0.25,
			maxZoom: 4,
			wheelSensitivity: 0.2,
			boxSelectionEnabled: true,
			selectionType: 'single',
			autounselectify: false,
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
	}, []);

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
		const { nodeIds, edgeIds } = collectResultHighlight(graph, result);
		cy.batch(() => {
			cy.elements('.path').removeClass('path');
			nodeIds.forEach((id) => cy.getElementById(id).addClass('path'));
			edgeIds.forEach((id) => cy.getElementById(id).addClass('path'));
		});
	}, [graph, result]);

	const ariaLabel = `${t('graphPage.canvas.ariaLabel', {
		vertices: graph.vertices,
		edges: graph.edges.length,
	})}. ${t('graphPage.canvas.source')}: ${graph.source}`;

	return (
		<div
			ref={containerRef}
			role="img"
			aria-label={ariaLabel}
			className={`h-[380px] w-full ${className}`}
		/>
	);
}

// Re-render only when the graph/result props actually change.
export default memo(GraphVisualization);
