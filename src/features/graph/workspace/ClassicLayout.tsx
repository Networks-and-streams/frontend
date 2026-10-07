import GraphInputPanel from '../components/GraphInputPanel';
import SavedGraphsPanel from '../components/SavedGraphsPanel';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';
import CanvasPanel from './CanvasPanel';
import ResultPanel from './ResultPanel';
import RunControls from './RunControls';
import SaveCard from './SaveCard';

/** The original two-column workspace: controls on the left, canvas and results on the right. */
export default function ClassicLayout({ ws }: { ws: GraphWorkspace }) {
	return (
		<div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
			<section className="flex flex-col gap-3 lg:self-start">
				{/* My Graphs — saved graphs loaded into Zustand once per session. */}
				<div className="rounded-3xl border border-border bg-card p-5">
					<SavedGraphsPanel openGraphId={ws.graphId} />
				</div>

				<SaveCard ws={ws} />

				<div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
					<GraphInputPanel value={ws.graph} onChange={ws.setGraph} />
					<div className="mt-2 border-t border-border-subtle pt-4">
						<RunControls ws={ws} />
					</div>
				</div>
			</section>

			<section className="flex min-w-0 flex-col gap-6">
				<div className="rounded-3xl border border-border bg-card p-4">
					<CanvasPanel ws={ws} />
				</div>
				<div className="space-y-4 rounded-3xl border border-border bg-card p-5">
					<ResultPanel ws={ws} />
				</div>
			</section>
		</div>
	);
}
