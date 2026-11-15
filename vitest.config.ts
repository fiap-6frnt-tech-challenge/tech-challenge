import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'apps/shell/vitest.config.ts',
      ...(process.env.DATABASE_URL ? ['apps/shell/vitest.integration.config.ts'] : []),
      'packages/design-system/vitest.config.ts',
      'packages/shared/vitest.config.ts',
      'packages/core/vitest.config.ts',
      'packages/stores/vitest.config.ts',
      'packages/api-client/vitest.config.ts',
      'apps/dashboard-mfe/vitest.config.ts',
      'apps/transactions-mfe/vitest.config.ts',
      'apps/transactions-mfe/vitest.storybook.config.ts',
    ],
  },
});
