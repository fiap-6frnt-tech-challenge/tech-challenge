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
    // este alias só vale no modo standalone (:3001).
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
      // singleton: true é obrigatório para react/react-dom e para os pacotes
      // @bytebank/stores e @bytebank/api-client — sem isso, shell e MFE teriam
      // Reacts/stores/caches divergentes (dois Reacts = "Invalid hook call").
      // requiredVersion: false → o remote aceita a versão que o host (shell)
      // já registrou no share scope, evitando conflitos de versão.
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
    port: 3001,
    // A 3001 é fixa por contrato (o shell consome via NEXT_PUBLIC_DASHBOARD_MFE_URL
    // na Task 8). strictPort faz o Rsbuild falhar com erro claro se a porta estiver
    // ocupada, em vez de cair silenciosamente para 3002 e quebrar o host.
    strictPort: true,
    // CORS para o shell consumir em dev (origin :3000 → remote :3001).
    // Em prod, configurar via headers da plataforma (Vercel/nginx) com allowlist.
    cors: {
      origin: ['http://localhost:3000'],
    },
  },
});
