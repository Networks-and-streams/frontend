import { useState } from 'react';
import AppShell from '@/app/components/AppShell';
import Button from '@/shared/components/ui/Button/Button';
import StateBlock from '@/shared/components/ui/StateBlock/StateBlock';
import { AlertIcon, GraphIcon, SpinnerIcon } from '@/shared/icons';
import { getApiErrorMessage } from '@/shared/api/http';
import { graphApi } from '../api/graph.api';
import GraphCanvas from '../components/GraphCanvas';
import GraphInputPanel from '../components/GraphInputPanel';
import {
	GRAPH_ALGORITHM,
	SAMPLE_GRAPH,
	type GraphAlgorithm,
	type GraphInput,
} from '../types';

type RunState = 'idle' | 'running' | 'error';

/**
 * Graph Resolver workspace.
 *
 * The graph editor and visualization are functional; actual algorithm
 * execution depends on the compute service, which is not implemented yet
 * (see compute/README.md). The Run action is wired to the graphApi boundary
 * so the integration point is real — it currently reports the missing service.
 */
export default function GraphPage() {
	const [graph, setGraph] = useState<GraphInput>(SAMPLE_GRAPH);
	const [algorithm, setAlgorithm] = useState<GraphAlgorithm>(GRAPH_ALGORITHM.MINTY);
	const [runState, setRunState] = useState<RunState>('idle');
	const [runError, setRunError] = useState<string | null>(null);

	const handleRun = async () => {
		setRunState('running');
		setRunError(null);
		try {
			await graphApi.execute({
				algorithm,
				graph,
				options: { includeSteps: true },
			});
			setRunState('idle');
		} catch (error) {
			setRunError(getApiErrorMessage(error));
			setRunState('error');
		}
	};

	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Graph Resolver</h1>
					<p className="text-sm text-foreground/50">
						Solve graph problems step by step with an interactive workspace.
					</p>
				</div>

				<div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
					<section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 lg:self-start">
						<GraphInputPanel value={graph} onChange={setGraph} />

						<div className="mt-2 flex flex-col gap-3 border-t border-border-subtle pt-4">
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="algorithm-select"
									className="text-xs uppercase tracking-[0.2em] text-foreground/40"
								>
									Algorithm
								</label>
								<select
									id="algorithm-select"
									value={algorithm}
									onChange={(e) => setAlgorithm(e.target.value as GraphAlgorithm)}
									className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
								>
									<option value={GRAPH_ALGORITHM.MINTY}>Minty (shortest paths)</option>
									<option value={GRAPH_ALGORITHM.FORD_FULKERSON}>Ford–Fulkerson (max flow)</option>
								</select>
							</div>

							<Button variant="primary" onClick={handleRun} disabled={runState === 'running'} className="w-full">
								{runState === 'running' ? (
									<>
										<SpinnerIcon size={16} className="animate-spin" />
										Solving…
									</>
								) : (
									<>Run algorithm</>
								)}
							</Button>
						</div>
					</section>

					<section className="flex min-w-0 flex-col gap-6">
						<div className="rounded-3xl border border-border bg-card p-4">
							<GraphCanvas graph={graph} />
						</div>

						<div className="rounded-3xl border border-border bg-card p-5">
							{runState === 'error' && runError ? (
								<div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
									<AlertIcon size={18} className="mt-0.5 shrink-0 text-rose-400" />
									<div className="flex flex-col gap-0.5 text-sm">
										<p className="font-medium text-rose-300">Compute unavailable</p>
										<p className="text-xs text-rose-300/70">{runError}</p>
									</div>
								</div>
							) : (
								<StateBlock
									icon={<GraphIcon size={22} />}
									title="No results yet"
									description="Run the selected algorithm to see the result and execution trace here. The compute service is planned but not connected yet — see compute/README.md."
								/>
							)}
						</div>
					</section>
				</div>
			</div>
		</AppShell>
	);
}