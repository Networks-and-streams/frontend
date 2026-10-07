import { useRef } from 'react';
import { GRAPH_FILE_ACCEPT } from '../lib/graphFile';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';

/** Hidden file input + a callback that opens it (import a graph file). */
export function useImportPicker(ws: GraphWorkspace) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const input = (
		<input
			ref={inputRef}
			type="file"
			accept={GRAPH_FILE_ACCEPT}
			className="hidden"
			onChange={(e) => {
				void ws.handleImport(e.target.files?.[0]);
				// Allow importing the same file again.
				e.target.value = '';
			}}
		/>
	);
	return { input, open: () => inputRef.current?.click() };
}
