import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { Core, EventObject, LayoutOptions } from 'cytoscape';
import elk from 'cytoscape-elk';
import { useTranslation } from 'react-i18next';
import type { ComputeResult, GraphInput } from '../types';
import {
	collectResultHighlight,
	elementStructureSignature,
	graphNodeId,
	toCytoscapeElements,
} from '../lib/graphElements';
import { createGraphLayout, createGraphStylesheet, createLayoutCandidates, readGraphTheme } from '../lib/graphStyle';
import { countCrossings } from '../lib/crossings';
import type { StepFrame } from '../lib/stepTrace';
import {
	addEdge,
	addVertex,
	removeEdge,
	removeVertex,
	renumberAfterRemoval,
	setEdgeWeight,
	setSource,
} from '../lib/graphEdits';
import {
	CanvasHint,
	EdgeWeightEditor,
	GraphCanvasMenu,
	MENU_WIDTH,
	WEIGHT_EDITOR_WIDTH,
	type CanvasMenuItem,
	type CanvasPoint,
} from './GraphCanvasMenu';

// Register the ELK layout once per module load.
cytoscape.use(elk);

interface GraphVisualizationProps {
	graph: GraphInput;
	/** Optional solver result used to highlight the computed shortest paths. */
	result?: ComputeResult | null;
	className?: string;
	/**
	 * When false, the canvas is rendered as a static, read-only preview: no
	 * panning, zooming, box-selection or pointer events. Used by dashboard
	 * previews so they can never interfere with application state.
	 */
	interactive?: boolean;
	/** Height utility class for the container (defaults to the full editor size). */
	heightClassName?: string;
	/**
	 * Makes the canvas a visual editor: double-click empty space to add a
	 * vertex, right-click (long-press on touch) a vertex or edge for actions.
	 */
	onChange?: (graph: GraphInput) => void;
	/** Algorithm step to show (playback): node states and distance labels. */
	frame?: StepFrame | null;
}

type Menu =
	| { kind: 'canvas'; at: CanvasPoint; model: CanvasPoint }
	| { kind: 'node'; at: CanvasPoint; vertex: number }
	| { kind: 'edge'; at: CanvasPoint; index: number };

interface WeightEdit {
	at: CanvasPoint;
	index: number;
}

/** Above this, only the default layout runs (trying several would be slow). */
const MAX_EDGES_FOR_LAYOUT_SEARCH = 400;
/** Above this, crossings are not counted (the check is O(E²)). */
const MAX_EDGES_FOR_CROSSINGS = 2000;

async function runLayout(cy: Core, options: LayoutOptions): Promise<void> {
	const layout = cy.layout(options);
	const done = layout.promiseOn('layoutstop');
	layout.run();
	await done;
}

const STEP_NODE_CLASSES = 'traced step-current step-visited step-frontier step-improved';

/** Vertex number → model position, read from the live canvas. */
type Positions = Map<number, CanvasPoint>;

/** Keeps a floating panel of `width` px opening at `point` inside the canvas. */
function clampToCanvas(cy: Core, point: CanvasPoint, width: number): CanvasPoint {
	return {
		x: Math.max(8, Math.min(point.x, cy.width() - width - 8)),
		y: Math.max(8, Math.min(point.y, cy.height() - 48)),
	};
}

function snapshotPositions(cy: Core): Positions {
	const positions: Positions = new Map();
	cy.nodes().forEach((node) => {
		positions.set(Number(node.data('vertex')), { ...node.position() });
	});
	return positions;
}

/**
 * Cytoscape.js graph visualization and visual editor.
 *
 * The domain model (`GraphInput`) is mapped to Cytoscape elements by
 * `../lib/graphElements`; Cytoscape types never leak into the domain or the
 * Zustand stores. The instance is created once, updated incrementally (only
 * changed elements are touched), and destroyed on unmount.
 *
 * Layout: an automatic ELK layout runs when the node/edge set changes from
 * outside (table edits, loading a graph). Edits made on the canvas keep every
 * node where it is and put a new vertex where the user clicked.
 */
function GraphVisualization({
	graph,
	result = null,
	className = '',
	interactive = true,
	heightClassName = 'h-[380px]',
	onChange,
	frame = null,
}: GraphVisualizationProps) {
	const { t } = useTranslation();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const cyRef = useRef<Core | null>(null);
	const structureSignatureRef = useRef<string>('');
	const editable = interactive && Boolean(onChange);

	const [menu, setMenu] = useState<Menu | null>(null);
	const [weightEdit, setWeightEdit] = useState<WeightEdit | null>(null);
	const [connectFrom, setConnectFrom] = useState<number | null>(null);

	// Latest values for Cytoscape event handlers, which are bound only once.
	const graphRef = useRef(graph);
	const onChangeRef = useRef(onChange);
	const connectFromRef = useRef(connectFrom);
	useLayoutEffect(() => {
		graphRef.current = graph;
		onChangeRef.current = onChange;
		connectFromRef.current = connectFrom;
	});
	/** Positions to apply on the next element sync instead of running a layout. */
	const pendingPositionsRef = useRef<Positions | null>(null);

	// Edge crossings of the current drawing (null = not counted: graph too large).
	const [crossings, setCrossings] = useState<number | null>(null);
	const [arranging, setArranging] = useState(false);
	/** Bumped per arrange; an older, still running arrange then gives up. */
	const arrangeRunRef = useRef(0);

	const recountCrossings = useCallback(() => {
		const cy = cyRef.current;
		if (!cy) return;
		const { edges } = graphRef.current;
		setCrossings(edges.length <= MAX_EDGES_FOR_CROSSINGS ? countCrossings(snapshotPositions(cy), edges) : null);
	}, []);

	/**
	 * Lays the graph out with the fewest edge crossings found: tries each
	 * candidate layout, stops early on a crossing-free one, keeps the best.
	 */
	const arrange = useCallback(async () => {
		const cy = cyRef.current;
		if (!cy) return;
		const run = ++arrangeRunRef.current;
		const { edges } = graphRef.current;
		const candidates =
			edges.length > MAX_EDGES_FOR_LAYOUT_SEARCH ? [createGraphLayout() as LayoutOptions] : createLayoutCandidates();

		setArranging(true);
		let best: { positions: Positions; crossings: number } | null = null;
		for (const options of candidates) {
			try {
				await runLayout(cy, options);
			} catch {
				continue; // a layout that fails on this graph is just skipped
			}
			if (run !== arrangeRunRef.current || cy.destroyed()) return;
			const positions = snapshotPositions(cy);
			const count = edges.length <= MAX_EDGES_FOR_CROSSINGS ? countCrossings(positions, edges) : 0;
			if (!best || count < best.crossings) best = { positions, crossings: count };
			if (count === 0) break;
		}

		if (best) {
			const winner = best.positions;
			cy.batch(() => {
				cy.nodes().forEach((node) => {
					const position = winner.get(Number(node.data('vertex')));
					if (position) node.position(position);
				});
			});
		}
		cy.fit(undefined, 28);
		setArranging(false);
		setCrossings(edges.length <= MAX_EDGES_FOR_CROSSINGS ? (best?.crossings ?? 0) : null);
	}, []);

	// Element definitions — recomputed only when the graph domain object changes.
	const elements = useMemo(() => toCytoscapeElements(graph), [graph]);

	/** Commits a canvas edit, keeping the given node positions. */
	const commit = useCallback((next: GraphInput, positions: Positions) => {
		pendingPositionsRef.current = positions;
		onChangeRef.current?.(next);
	}, []);

	/**
	 * Commits a canvas edit keeping every node where it is now. `renumber` maps
	 * an old vertex number to its new one (null drops it) for vertex removal.
	 */
	const commitOnCanvas = useCallback(
		(next: GraphInput, renumber?: (vertex: number) => number | null) => {
			const cy = cyRef.current;
			if (!cy) return;
			const positions: Positions = new Map();
			snapshotPositions(cy).forEach((position, vertex) => {
				const target = renumber ? renumber(vertex) : vertex;
				if (target !== null) positions.set(target, position);
			});
			commit(next, positions);
		},
		[commit],
	);

	const addVertexAt = useCallback(
		(model: CanvasPoint) => {
			const cy = cyRef.current;
			if (!cy) return;
			const current = graphRef.current;
			const positions = snapshotPositions(cy);
			positions.set(current.vertices + 1, model);
			commit(addVertex(current), positions);
		},
		[commit],
	);

	const connect = useCallback(
		(from: number, to: number) => {
			const cy = cyRef.current;
			setConnectFrom(null);
			if (!cy || from === to) return;
			const current = graphRef.current;
			commit(addEdge(current, from, to, 1), snapshotPositions(cy));
			// Ask for the weight right away, next to the target vertex.
			setWeightEdit({
				index: current.edges.length,
				at: clampToCanvas(cy, cy.getElementById(graphNodeId(to)).renderedPosition(), WEIGHT_EDITOR_WIDTH),
			});
		},
		[commit],
	);

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
			boxSelectionEnabled: interactive,
			selectionType: 'single',
			autounselectify: !interactive,
			userZoomingEnabled: interactive,
			userPanningEnabled: interactive,
		});
		cyRef.current = cy;
		// Force a layout on the next element sync for this fresh instance.
		structureSignatureRef.current = '';

		if (editable) {
			const openMenu = (event: EventObject) => {
				setConnectFrom(null);
				setWeightEdit(null);
				const at = clampToCanvas(cy, event.renderedPosition, MENU_WIDTH);
				const target = event.target;
				if (target === cy) {
					setMenu({ kind: 'canvas', at, model: { ...event.position } });
				} else if (target.isNode()) {
					setMenu({ kind: 'node', at, vertex: Number(target.data('vertex')) });
				} else if (target.isEdge()) {
					setMenu({ kind: 'edge', at, index: Number(target.data('index')) });
				}
			};

			cy.on('cxttap', openMenu);
			// Long-press opens the menu on touch screens (a mouse uses right-click).
			cy.on('taphold', (event) => {
				if (event.originalEvent?.type.startsWith('touch')) openMenu(event);
			});
			cy.on('dbltap', (event) => {
				if (event.target === cy) addVertexAt({ ...event.position });
			});
			cy.on('tap', (event) => {
				const from = connectFromRef.current;
				if (from === null) return;
				if (event.target !== cy && event.target.isNode()) {
					connect(from, Number(event.target.data('vertex')));
				} else {
					setConnectFrom(null);
				}
			});
		}

		// Dragging a vertex changes the crossing count.
		if (interactive) cy.on('dragfree', 'node', () => recountCrossings());

		// Keep the canvas sized to its container (responsive).
		const resizeObserver = new ResizeObserver(() => cy.resize());
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			cy.destroy();
			cyRef.current = null;
		};
	}, [interactive, editable, addVertexAt, connect, recountCrossings]);

	// Sync elements: add/remove changed elements and update data in place.
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;
		const pending = pendingPositionsRef.current;
		pendingPositionsRef.current = null;

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
			if (pending) {
				cy.nodes().forEach((node) => {
					const position = pending.get(Number(node.data('vertex')));
					if (position) node.position(position);
				});
			}
		});

		// Relayout only when the node/edge set changed from outside the canvas.
		const signature = elementStructureSignature(elements);
		if (signature !== structureSignatureRef.current) {
			structureSignatureRef.current = signature;
			if (!pending) {
				const frameId = requestAnimationFrame(() => void arrange());
				return () => cancelAnimationFrame(frameId);
			}
		}
		// Canvas edits keep positions; the crossing count may still change.
		const frameId = requestAnimationFrame(recountCrossings);
		return () => cancelAnimationFrame(frameId);
	}, [elements, arrange, recountCrossings]);

	// Mark the vertex an edge is being drawn from.
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy || connectFrom === null) return;
		const node = cy.getElementById(graphNodeId(connectFrom));
		node.addClass('connect-from');
		return () => {
			node.removeClass('connect-from');
		};
	}, [connectFrom, elements]);

	// Cancel drawing an edge with Escape.
	useEffect(() => {
		if (connectFrom === null) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setConnectFrom(null);
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [connectFrom]);

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

	// Paint the current playback step; restores plain labels when it ends.
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;
		const improved = new Set(frame?.improved.map((change) => change.vertex));
		cy.batch(() => {
			cy.nodes().forEach((node) => {
				const vertex = Number(node.data('vertex'));
				node.removeClass(STEP_NODE_CLASSES);
				if (!frame) {
					node.data('label', String(vertex));
					return;
				}
				node.data('label', `${vertex}\n${frame.distances.get(vertex) ?? '∞'}`);
				node.addClass('traced');
				if (vertex === frame.current) node.addClass('step-current');
				else if (frame.visited.has(vertex)) node.addClass('step-visited');
				else if (frame.frontier.has(vertex)) node.addClass('step-frontier');
				if (improved.has(vertex) && vertex !== frame.current) node.addClass('step-improved');
			});
			cy.edges().forEach((edge) => {
				edge.toggleClass('step-relaxed', Boolean(frame?.relaxedEdges.has(Number(edge.data('index')))));
			});
		});
	}, [frame, elements]);

	const closeMenu = useCallback(() => setMenu(null), []);
	const closeWeightEdit = useCallback(() => setWeightEdit(null), []);

	type MenuAction = 'addVertex' | 'connect' | 'setSource' | 'deleteVertex' | 'editWeight' | 'deleteEdge';

	/** Menu contents as plain data; {@link handleMenuAction} performs the action. */
	const menuItems = (current: Menu): { title: string; items: CanvasMenuItem<MenuAction>[] } => {
		if (current.kind === 'canvas') {
			return {
				title: t('graphPage.canvas.menu.canvasTitle'),
				items: [{ id: 'addVertex', label: t('graphPage.canvas.menu.addVertex') }],
			};
		}
		if (current.kind === 'node') {
			return {
				title: t('graphPage.canvas.menu.vertexTitle', { vertex: current.vertex }),
				items: [
					{ id: 'connect', label: t('graphPage.canvas.menu.connect') },
					{
						id: 'setSource',
						label: t('graphPage.canvas.menu.setSource'),
						disabled: graph.source === current.vertex,
					},
					{
						id: 'deleteVertex',
						label: t('graphPage.canvas.menu.deleteVertex'),
						danger: true,
						disabled: graph.vertices <= 1,
					},
				],
			};
		}
		const edge = graph.edges[current.index];
		return {
			title: t('graphPage.canvas.menu.edgeTitle', { from: edge?.from, to: edge?.to }),
			items: [
				{ id: 'editWeight', label: t('graphPage.canvas.menu.editWeight') },
				{ id: 'deleteEdge', label: t('graphPage.canvas.menu.deleteEdge'), danger: true },
			],
		};
	};

	const handleMenuAction = (action: MenuAction) => {
		if (!menu) return;
		if (menu.kind === 'canvas') {
			if (action === 'addVertex') addVertexAt(menu.model);
		} else if (menu.kind === 'node') {
			const vertex = menu.vertex;
			if (action === 'connect') setConnectFrom(vertex);
			if (action === 'setSource') commitOnCanvas(setSource(graph, vertex));
			if (action === 'deleteVertex') {
				commitOnCanvas(removeVertex(graph, vertex), (v) => (v === vertex ? null : renumberAfterRemoval(v, vertex)));
			}
		} else {
			const index = menu.index;
			if (action === 'editWeight') setWeightEdit({ index, at: menu.at });
			if (action === 'deleteEdge') commitOnCanvas(removeEdge(graph, index));
		}
	};

	const ariaLabel = `${t('graphPage.canvas.ariaLabel', {
		vertices: graph.vertices,
		edges: graph.edges.length,
	})}. ${t('graphPage.canvas.source')}: ${graph.source}`;

	const canvas = (
		<div
			ref={containerRef}
			role="img"
			aria-label={ariaLabel}
			className={`${heightClassName} w-full ${interactive ? '' : 'pointer-events-none'} ${className}`}
		/>
	);

	if (!editable) return canvas;

	const openMenu = menu ? menuItems(menu) : null;
	const editedEdge = weightEdit ? graph.edges[weightEdit.index] : undefined;

	return (
		<div>
			<div className="relative" onContextMenu={(e) => e.preventDefault()}>
				{canvas}
				{menu && openMenu && (
					<GraphCanvasMenu
						at={menu.at}
						title={openMenu.title}
						items={openMenu.items}
						onSelect={handleMenuAction}
						onClose={closeMenu}
					/>
				)}
				{weightEdit && editedEdge && (
					<EdgeWeightEditor
						key={weightEdit.index}
						at={weightEdit.at}
						label={t('graphPage.canvas.menu.weightLabel', { from: editedEdge.from, to: editedEdge.to })}
						submitLabel={t('graphPage.canvas.menu.apply')}
						initial={editedEdge.weight}
						onCommit={(weight) => commitOnCanvas(setEdgeWeight(graph, weightEdit.index, weight))}
						onClose={closeWeightEdit}
					/>
				)}
			</div>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<CanvasHint>
					{connectFrom !== null
						? t('graphPage.canvas.connectHint', { vertex: connectFrom })
						: t('graphPage.canvas.editHint')}
				</CanvasHint>
				<div className="flex shrink-0 items-center gap-2 pt-1.5">
					{crossings !== null && !arranging && (
						<span
							className={`rounded-full border px-2 py-0.5 text-[11px] ${
								crossings === 0
									? 'border-accent/30 bg-accent/10 text-accent'
									: 'border-amber-400/30 bg-amber-400/10 text-amber-300'
							}`}
						>
							{t('graphPage.canvas.crossings', { count: crossings })}
						</span>
					)}
					<button
						type="button"
						onClick={() => void arrange()}
						disabled={arranging}
						className="rounded-lg px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
						title={t('graphPage.canvas.rearrangeTitle')}
					>
						{arranging ? t('graphPage.canvas.arranging') : t('graphPage.canvas.rearrange')}
					</button>
				</div>
			</div>
		</div>
	);
}

// Re-render only when the graph/result props actually change.
export default memo(GraphVisualization);
