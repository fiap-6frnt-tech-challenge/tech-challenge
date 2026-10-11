import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const nextStub = fileURLToPath(new URL('./next-stub.ts', import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  viteFinal: async (config) =>
    mergeConfig(config, {
      define: {
        'process.env': JSON.stringify({ NODE_ENV: process.env.NODE_ENV ?? 'development' }),
      },
      resolve: {
        alias: [{ find: /^next\/(image|link|navigation)$/, replacement: nextStub }],
      },
      optimizeDeps: {
        include: ['@hookform/resolvers/zod', 'react-hook-form', 'zod'],
      },
    }),
};
export default config;
