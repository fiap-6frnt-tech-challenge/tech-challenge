import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'hello',
      manifest: { filePath: '', fileName: 'mf-manifest.json' },
      exposes: {
        './Hello': './src/Hello.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: true,
        },
        // TODO (Track A dia 2, após Tasks 3+4 mergearem):
        // Adicionar @bytebank/design-system e @bytebank/shared como shared singletons.
        // Devem espelhar o `shared` declarado em apps/shell/src/lib/federation.ts (Track B).
      },
    }),
  ],
  server: {
    port: 3001,
    // CORS para o shell consumir em dev (origin :3000 → remote :3001).
    // Em prod, configurar via headers da plataforma (Vercel/nginx) com allowlist.
    cors: {
      origin: ['http://localhost:3000'],
    },
  },
});
