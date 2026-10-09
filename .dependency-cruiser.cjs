const path = require('node:path');

const npm = (...names) => `(^|/)node_modules/(${names.join('|')})/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-puro',
      comment:
        'O core (domínio + aplicação) não depende de frameworks, IO nem de outros pacotes Bytebank (ADR-001).',
      severity: 'error',
      from: { path: '^packages/core/' },
      to: {
        path: [
          npm('react', 'react-dom', 'next', 'next-auth', 'drizzle-orm', 'pg', '@vercel/blob'),
          '^(apps|packages)/(?!core/)',
        ],
      },
    },
    {
      name: 'core-sem-node',
      comment: 'O core não importa módulos do Node (node:*): IO fica na infraestrutura.',
      severity: 'error',
      from: { path: '^packages/core/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'mfe-isolado',
      comment:
        'MFEs não importam o shell, o Next nem o banco: integração via Module Federation e pacotes @bytebank/*.',
      severity: 'error',
      from: { path: '^apps/[^/]+-mfe/' },
      to: { path: ['^apps/shell/', npm('next', 'next-auth', 'drizzle-orm', 'pg')] },
    },
    {
      name: 'shell-apresentacao-via-container',
      comment:
        'Rotas /api, páginas, componentes e adaptadores HTTP do shell não acessam banco nem infraestrutura: só via @/server/container.',
      severity: 'error',
      from: { path: '^apps/shell/src/(app|components|server/http)/' },
      to: { path: ['^apps/shell/src/(db|server/infrastructure)/', npm('drizzle-orm', 'pg')] },
    },
    {
      name: 'apresentacao-sem-infraestrutura',
      comment:
        'A apresentação recebe a infraestrutura do composition root (container.ts), nunca direto.',
      severity: 'error',
      from: { path: '/presentation/' },
      to: { path: '/infrastructure/' },
    },
    {
      name: 'atomo-sem-molecula-ou-organismo',
      comment: 'Atomic Design: átomo não importa molécula nem organismo (S1-09).',
      severity: 'error',
      from: { path: '^packages/design-system/src/atoms/' },
      to: { path: '^packages/design-system/src/(molecules|organisms)/' },
    },
    {
      name: 'molecula-sem-organismo',
      comment: 'Atomic Design: molécula não importa organismo (S1-09).',
      severity: 'error',
      from: { path: '^packages/design-system/src/molecules/' },
      to: { path: '^packages/design-system/src/organisms/' },
    },
    {
      name: 'nao-resolvido',
      comment:
        'Import que não resolve: as regras acima dependem de caminhos resolvidos (aliases, exports dos pacotes).',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true, pathNot: '^server-only$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['^(apps|packages)/[^/]+/(?!(src|node_modules)(/|$))', '\\.stories\\.tsx?$'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: path.join(__dirname, 'tsconfig.depcruise.json') },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
