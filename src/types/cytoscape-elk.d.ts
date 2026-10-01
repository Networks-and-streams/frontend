/**
 * Minimal ambient types for `cytoscape-elk` (the package ships no type
 * definitions).
 *
 * Its default export is a cytoscape extension registrar, passed to
 * `cytoscape.use(...)`, which registers the `elk` layout.
 */
declare module 'cytoscape-elk' {
	import type { Ext } from 'cytoscape';
	const registerElk: Ext;
	export default registerElk;
}
