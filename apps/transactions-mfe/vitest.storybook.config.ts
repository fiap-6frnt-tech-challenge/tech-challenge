import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  server: {
    host: '127.0.0.1',
  },
  plugins: [storybookTest({ configDir: fileURLToPath(new URL('.storybook', import.meta.url)) })],
  test: {
    name: 'transactions-mfe-storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      api: {
        host: '127.0.0.1',
        port: 64124,
      },
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['.storybook/vitest.setup.ts'],
  },
});
