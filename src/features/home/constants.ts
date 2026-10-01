/**
 * Static content keys for the Home / Welcome page.
 *
 * Only i18n key lists live here; the actual copy is in the shared translation
 * resources (`shared/i18n/resources`). Keeping the order in one place keeps the
 * page components declarative.
 */

/** "How it works" workflow steps, in display order. */
export const HOW_IT_WORKS_KEYS = ['create', 'configure', 'run', 'view'] as const;

/** Maximum number of saved graphs shown in the "Recent graphs" section. */
export const RECENT_GRAPHS_LIMIT = 4;
