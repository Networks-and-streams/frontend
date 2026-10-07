/**
 * Edge-crossing count of a drawing, treating every edge as a straight segment
 * between its vertex centers (how the canvas draws them).
 *
 * Edges sharing a vertex never count as crossing; parallel and opposite edges
 * between the same pair are one segment; self-loops are ignored. Two segments
 * lying on the same line and overlapping count as a crossing (they hide each
 * other). O(E²) — callers limit it to moderate graphs.
 */

export interface Point {
	x: number;
	y: number;
}

const EPSILON = 1e-9;

function orientation(a: Point, b: Point, c: Point): number {
	const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
	return Math.abs(value) < EPSILON ? 0 : Math.sign(value);
}

function onSegment(a: Point, b: Point, p: Point): boolean {
	return (
		Math.min(a.x, b.x) - EPSILON <= p.x &&
		p.x <= Math.max(a.x, b.x) + EPSILON &&
		Math.min(a.y, b.y) - EPSILON <= p.y &&
		p.y <= Math.max(a.y, b.y) + EPSILON
	);
}

export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
	const o1 = orientation(a, b, c);
	const o2 = orientation(a, b, d);
	const o3 = orientation(c, d, a);
	const o4 = orientation(c, d, b);
	if (o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) return true;
	// Collinear overlap, or an endpoint lying on the other segment.
	return (
		(o1 === 0 && onSegment(a, b, c)) ||
		(o2 === 0 && onSegment(a, b, d)) ||
		(o3 === 0 && onSegment(c, d, a)) ||
		(o4 === 0 && onSegment(c, d, b))
	);
}

export function countCrossings(
	positions: Map<number, Point>,
	edges: ReadonlyArray<{ from: number; to: number }>,
): number {
	const seen = new Set<string>();
	const segments: Array<[number, number]> = [];
	for (const { from, to } of edges) {
		if (from === to || !positions.has(from) || !positions.has(to)) continue;
		const key = from < to ? `${from}-${to}` : `${to}-${from}`;
		if (seen.has(key)) continue;
		seen.add(key);
		segments.push([from, to]);
	}

	let crossings = 0;
	for (let i = 0; i < segments.length; i += 1) {
		const [a, b] = segments[i];
		for (let j = i + 1; j < segments.length; j += 1) {
			const [c, d] = segments[j];
			if (a === c || a === d || b === c || b === d) continue;
			if (segmentsCross(positions.get(a)!, positions.get(b)!, positions.get(c)!, positions.get(d)!)) {
				crossings += 1;
			}
		}
	}
	return crossings;
}
