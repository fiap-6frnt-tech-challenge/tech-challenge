import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  resolve: {
    // O barrel do @bytebank/design-system reexporta Header/Sidebar, que importam
    // next/image, next/link e next/navigation. Em dev o Rspack não faz tree-shaking,
    // então esses módulos são avaliados no browser e quebram num bundle não-Next
    // (`process is not defined`, `__dirname` mockado). O MFE nunca renderiza esses
    // componentes de layout (são do shell), então resolvemos os imports de Next para
    // módulos vazios. Quando o shell consome o remote, @bytebank/design-system é um
    // singleton compartilhado → a instância do host (com o Next real) é usada, logo
    // este alias só vale no modo standalone (:3002).
    alias: {
      'next/image': false,
      'next/link': false,
      'next/navigation': false,
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'dashboard',
      manifest: { filePath: '', fileName: 'mf-manifest.json' },
      exposes: {
        './Dashboard': './src/Dashboard.tsx',
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
    port: 3002,
    strictPort: true,
    cors: {
      origin: ['http://localhost:3000'],
    },
  },
});
