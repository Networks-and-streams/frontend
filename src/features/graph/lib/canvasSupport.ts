/** True when the browser can draw on a 2D canvas (what the graph view needs). */
export function supportsCanvas(): boolean {
	try {
		return Boolean(document.createElement('canvas').getContext('2d'));
	} catch {
		return false;
	}
}
