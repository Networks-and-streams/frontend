import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/app/components/AppShell';
import { useGraphWorkspace } from '../hooks/useGraphWorkspace';
import CanvasLayout from '../workspace/CanvasLayout';
import ClassicLayout from '../workspace/ClassicLayout';

type Layout = 'canvas' | 'classic';

const LAYOUT_KEY = 'graph.layout';

function readLayout(): Layout {
	try {
		return window.localStorage.getItem(LAYOUT_KEY) === 'classic' ? 'classic' : 'canvas';
	} catch {
		return 'canvas';
	}
}

/**
 * Graph Resolver workspace. The canvas-first layout is the default; the
 * original two-column layout stays available (choice remembered per browser).
 * Both render the same workspace state from {@link useGraphWorkspace}.
 */
export default function GraphPage() {
	const { t } = useTranslation();
	const ws = useGraphWorkspace();
	const [layout, setLayoutState] = useState<Layout>(readLayout);

	const setLayout = (next: Layout) => {
		setLayoutState(next);
		try {
			window.localStorage.setItem(LAYOUT_KEY, next);
		} catch {
			// Storage blocked: the choice just is not remembered.
		}
	};

	return (
		<AppShell>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('common.appName')}</h1>
						<p className="text-sm text-foreground/50">{t('graphPage.subtitle')}</p>
					</div>

					<div
						role="radiogroup"
						aria-label={t('graphPage.layout.label')}
						className="flex rounded-xl border border-border bg-muted p-0.5 text-xs"
					>
						{(['canvas', 'classic'] as const).map((id) => (
							<button
								key={id}
								type="button"
								role="radio"
								aria-checked={layout === id}
								onClick={() => setLayout(id)}
								className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
									layout === id ? 'bg-card text-foreground shadow-sm' : 'text-foreground/50 hover:text-foreground'
								}`}
							>
								{id === 'canvas' ? t('graphPage.layout.canvas') : t('graphPage.layout.classic')}
							</button>
						))}
					</div>
				</div>

				{layout === 'canvas' ? <CanvasLayout ws={ws} /> : <ClassicLayout ws={ws} />}
			</div>
		</AppShell>
	);
}
