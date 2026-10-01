/**
 * Static content for the About / Help page.
 *
 * Developer names are proper nouns and are intentionally not localized (they
 * read the same in both English and Ukrainian); every other user-facing string
 * on the page lives in the i18n resources.
 */
export const DEVELOPERS = [
	'Василенко Артем Денисович',
	'Звараш Максим Русланович',
	'Осовський Владислав Станіславович',
	'Сватенко Степан Олександрович',
	'Унгурян Олександр Юрійович',
	'Тимчук Тарас Анатолійович',
	'Загаєвський Олександр Сергійович',
] as const;

/** Academic supervisor of the project (proper noun, not localized). */
export const SUPERVISOR = 'Руснак Микола Андрійович';

/** i18n keys of the "About the application" feature bullets (order matters). */
export const APP_FEATURE_KEYS = [
	'about.app.features.create',
	'about.app.features.save',
	'about.app.features.algorithms',
	'about.app.features.results',
] as const;

/** i18n keys of the "How to use" steps, in display order. */
export const HOW_TO_STEP_KEYS = ['create', 'define', 'algorithm', 'source', 'run', 'review'] as const;

/** i18n keys of the input constraints list, in display order. */
export const CONSTRAINT_KEYS = ['vertices', 'source', 'edges', 'weights', 'saving'] as const;
