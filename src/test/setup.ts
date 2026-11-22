import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Initialize i18next for every test file: components call `t()` through
// useTranslation and would otherwise receive raw keys (NO_I18NEXT_INSTANCE).
import '@/shared/i18n';

/**
 * Global Vitest setup (expansion plan §3.8).
 *
 * - jest-dom matchers (`toBeInTheDocument`, …);
 * - React Testing Library cleanup between tests (globals are on, so RTL's
 *   automatic cleanup does not run by itself);
 * - i18n is initialized eagerly so `t()` is usable in unit tests.
 */
afterEach(() => {
	cleanup();
});
