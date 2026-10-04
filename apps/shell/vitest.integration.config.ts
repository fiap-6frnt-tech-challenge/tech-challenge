import { defineConfig } from 'vitest/config';
import unit from './vitest.config';

export default defineConfig({
  resolve: unit.resolve,
  test: {
    name: 'integration',
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['src/server/testing/integration.setup.ts'],
    fileParallelism: false,
  },
});
