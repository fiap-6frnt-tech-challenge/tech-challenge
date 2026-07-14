import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/shell/vitest.config.ts',
      'packages/design-system/vitest.config.ts',
      'packages/shared/vitest.config.ts',
      'packages/stores/vitest.config.ts',
      'packages/api-client/vitest.config.ts',
    ],
  },
});
