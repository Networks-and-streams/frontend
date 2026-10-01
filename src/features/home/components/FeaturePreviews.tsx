import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGraphEditorStore } from '@/features/graph/store/graphEditorStore';
import { PREVIEW_GRAPH, PREVIEW_RESULT } from '../constants';
import FeatureCard from './FeatureCard';
import GraphPreview from './GraphPreview';
import SavedGraphsPreview from './SavedGraphsPreview';
import AboutPreview from './AboutPreview';

/**
 * Grid of interactive preview cards for the application's main sections.
 *
 * Graph previews reuse the real visualization (read-only); the saved-graphs
 * preview reads the existing store. Every card opens an existing route — no
 * duplicate functionality and no state mutation on render.
 */
export default function FeaturePreviews() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const createGraph = () => {
		useGraphEditorStore.getState().startNew();
		navigate('/graph');
	};

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">
				{t('home.previews.title')}
			</h2>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<FeatureCard
					preview={<GraphPreview graph={PREVIEW_GRAPH} />}
					title={t('home.previews.editor.title')}
					description={t('home.previews.editor.description')}
					actionLabel={t('home.previews.editor.open')}
					onOpen={createGraph}
				/>

				<FeatureCard
					preview={<GraphPreview graph={PREVIEW_GRAPH} result={PREVIEW_RESULT} />}
					title={t('home.previews.solver.title')}
					description={t('home.previews.solver.description')}
					actionLabel={t('home.previews.solver.open')}
					onOpen={() => navigate('/graph')}
				/>

				<FeatureCard
					preview={<SavedGraphsPreview />}
					title={t('home.previews.saved.title')}
					description={t('home.previews.saved.description')}
					actionLabel={t('home.previews.saved.open')}
					onOpen={() => navigate('/graph')}
				/>

				<FeatureCard
					preview={<AboutPreview />}
					title={t('home.previews.about.title')}
					description={t('home.previews.about.description')}
					actionLabel={t('home.previews.about.open')}
					onOpen={() => navigate('/about')}
				/>
			</div>
		</section>
	);
}
