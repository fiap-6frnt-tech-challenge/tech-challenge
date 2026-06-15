import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

const MFE_ORIGIN = process.env.MFE_ORIGIN ?? 'http://localhost:3003';

export default defineConfig({
  output: {
    assetPrefix: MFE_ORIGIN,
  },
  resolve: {
    alias: {
      'next/image': false,
      'next/link': false,
      'next/navigation': false,
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'transactions',
      manifest: { filePath: '', fileName: 'mf-manifest.json' },
      exposes: {
        './TransactionsPage': './src/TransactionsPage.tsx',
        './AccountOverview': './src/components/AccountOverview.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        'react-dom': { singleton: true, requiredVersion: false },
        '@bytebank/design-system': { singleton: true, requiredVersion: false },
        '@bytebank/shared': { singleton: true, requiredVersion: false },
        '@bytebank/stores': { singleton: true, requiredVersion: false },
        '@bytebank/api-client': { singleton: true, requiredVersion: false },
      },
    }),
  ],
  server: {
    port: 3003,
    strictPort: true,
    cors: {
      origin: ['http://localhost:3000'],
    },
  },
});
