import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

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
