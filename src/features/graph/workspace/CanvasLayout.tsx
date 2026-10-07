import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/ui/Button/Button';
import { DownloadIcon, FileTextIcon, PlusIcon, SaveIcon, SpinnerIcon } from '@/shared/icons';
import GraphInputPanel from '../components/GraphInputPanel';
import SavedGraphsPanel from '../components/SavedGraphsPanel';
import type { GraphWorkspace } from '../hooks/useGraphWorkspace';
import CanvasPanel from './CanvasPanel';
import Popover from './Popover';
import ResultPanel from './ResultPanel';
import RunControls from './RunControls';
import { SaveStatusBadge } from './SaveCard';
import { useImportPicker } from './useImportPicker';

type Tab = 'result' | 'table';

const toolbarButton =
	'inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const menuItem =
	'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Canvas-first workspace: one toolbar, a large canvas with the run panel
 * beside it, and results / the edge table in tabs below.
 */
export default function CanvasLayout({ ws }: { ws: GraphWorkspace }) {
	const { t } = useTranslation();
	const [tab, setTab] = useState<Tab>('result');
	const picker = useImportPicker(ws);

	return (
		<div className="flex flex-col gap-4">
			{/* Toolbar: name, new, open, save and the rarer file actions. */}
			<div className="flex flex-wrap items-center gap-2 rounded-3xl border border-border bg-card p-3">
				<label htmlFor="graph-name" className="sr-only">
					{t('graphPage.saveCard.name')}
				</label>
				<input
					id="graph-name"
					type="text"
					value={ws.graphName}
					onChange={(e) => ws.setName(e.target.value)}
					placeholder={t('graphPage.saveCard.namePlaceholder')}
					className="h-9 w-full min-w-0 rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-64"
				/>
				<SaveStatusBadge ws={ws} />

				<div className="flex flex-wrap items-center gap-2 sm:ml-auto">
					<button type="button" className={toolbarButton} onClick={ws.handleNew} title={t('graphPage.saveCard.newTitle')}>
						<PlusIcon size={14} />
						{t('graphPage.saveCard.new')}
					</button>

					<Popover
						label={<>{t('graphPage.toolbar.myGraphs')} ▾</>}
						buttonClassName={toolbarButton}
						panelClassName="w-80 max-h-[60vh] overflow-auto p-3"
						align="right"
					>
						{(close) => <SavedGraphsPanel openGraphId={ws.graphId} onOpened={close} />}
					</Popover>

					<Button variant="primary" size="sm" onClick={() => ws.handleSave(false)} disabled={!ws.canSave}>
						{ws.saving ? <SpinnerIcon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
						{ws.graphId ? t('graphPage.saveCard.saveChanges') : t('graphPage.saveCard.save')}
					</Button>

					<Popover
						label={<span aria-hidden>⋯</span>}
						title={t('graphPage.toolbar.more')}
						buttonClassName={`${toolbarButton} px-2.5`}
						panelClassName="w-60"
						align="right"
					>
						{(close) => (
							<div role="menu" aria-label={t('graphPage.toolbar.more')} className="flex flex-col">
								<button
									type="button"
									role="menuitem"
									className={menuItem}
									disabled={!ws.canSave}
									onClick={() => {
										close();
										void ws.handleSave(true);
									}}
								>
									<SaveIcon size={14} />
									{t('graphPage.saveCard.saveAsNew')}
								</button>
								<button
									type="button"
									role="menuitem"
									className={menuItem}
									title={t('graphPage.file.importTitle')}
									onClick={() => {
										close();
										picker.open();
									}}
								>
									<FileTextIcon size={14} />
									{t('graphPage.file.import')}
								</button>
								<button
									type="button"
									role="menuitem"
									className={menuItem}
									disabled={!ws.graphValid}
									onClick={() => {
										close();
										ws.handleDownload();
									}}
								>
									<DownloadIcon size={14} />
									{t('graphPage.file.downloadTitle')}
								</button>
							</div>
						)}
					</Popover>
					{picker.input}
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
				<div className="min-w-0 rounded-3xl border border-border bg-card p-3">
					<CanvasPanel ws={ws} heightClassName="h-[60vh] min-h-[420px]" />
				</div>
				<aside className="rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
					<RunControls ws={ws} onRan={() => setTab('result')} />
				</aside>
			</div>

			<div className="rounded-3xl border border-border bg-card p-5">
				<div role="tablist" aria-label={t('graphPage.toolbar.panels')} className="mb-4 flex gap-1">
					{(['result', 'table'] as const).map((id) => (
						<button
							key={id}
							type="button"
							role="tab"
							id={`workspace-tab-${id}`}
							aria-selected={tab === id}
							aria-controls={`workspace-panel-${id}`}
							onClick={() => setTab(id)}
							className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
								tab === id ? 'bg-accent/15 text-accent' : 'text-foreground/50 hover:text-foreground'
							}`}
						>
							{id === 'result' ? t('graphPage.toolbar.tabResult') : t('graphPage.toolbar.tabTable')}
						</button>
					))}
				</div>
				<div role="tabpanel" id={`workspace-panel-${tab}`} aria-labelledby={`workspace-tab-${tab}`}>
					{tab === 'result' ? <ResultPanel ws={ws} /> : <GraphInputPanel value={ws.graph} onChange={ws.setGraph} />}
				</div>
			</div>
		</div>
	);
}
