import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // shell roda majoritariamente em Node (API routes + server components)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
  },
});
