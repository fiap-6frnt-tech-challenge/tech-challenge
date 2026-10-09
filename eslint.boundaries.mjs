const restrict = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] });

const coreFrameworks = {
  group: [
    'react',
    'react/*',
    'react-dom',
    'react-dom/*',
    'next',
    'next/*',
    'next-auth',
    'next-auth/*',
  ],
  message: 'O core não depende de frameworks.',
};
const coreIO = {
  group: ['drizzle-orm', 'drizzle-orm/*', 'pg', '@vercel/blob', '@vercel/blob/*', 'node:*'],
  message: 'O core não executa IO.',
};
const corePackages = {
  group: ['@bytebank/*'],
  message: 'O core não depende de outros pacotes Bytebank.',
};

const mfeShell = {
  group: ['@bytebank/shell', '@bytebank/shell/*', '**/shell/**'],
  message: 'MFEs não importam o shell: a integração é via Module Federation e pacotes @bytebank/*.',
};
const mfeNext = {
  group: ['next', 'next/*', 'next-auth', 'next-auth/*'],
  message: 'MFEs rodam no Rsbuild, fora do Next.',
};
const mfeDatabase = {
  group: ['drizzle-orm', 'drizzle-orm/*', 'pg'],
  message: 'MFEs não acessam o banco: use os gateways do @bytebank/api-client.',
};
const presentationInfrastructure = {
  group: ['**/infrastructure', '**/infrastructure/**'],
  message:
    'A apresentação não importa a infraestrutura: receba-a do composition root (container.ts).',
};

const shellInfrastructure = {
  group: [
    '**/db',
    '**/db/**',
    '**/infrastructure',
    '**/infrastructure/**',
    'drizzle-orm',
    'drizzle-orm/*',
    'pg',
  ],
  message:
    'Rotas, páginas e componentes do shell não acessam banco nem infraestrutura: use @/server/container.',
};

const movedToCore = {
  '@bytebank/core': [
    'TransactionType',
    'Attachment',
    'Transaction',
    'Account',
    'NewTransaction',
    'UpdateTransaction',
    'DashboardSummary',
    'TRANSACTION_TYPE',
    'CATEGORIES',
    'Category',
    'CategoryId',
    'suggestCategory',
    'getAll',
    'getRecent',
    'calculateBalance',
    'aggregateByMonth',
    'cumulativeBalance',
    'groupByCategory',
    'MonthlyAggregate',
    'BalancePoint',
    'CategoryAggregate',
  ],
  '@bytebank/core/application': ['AccountOverview'],
  '@bytebank/core/schemas': [
    'registerSchema',
    'RegisterInput',
    'createTransactionSchema',
    'updateTransactionSchema',
    'listTransactionsQuerySchema',
  ],
};

export function coreBoundaries(root = '') {
  return [
    {
      files: [`${root}src/**/*.{ts,tsx}`],
      rules: restrict(coreFrameworks, coreIO, corePackages),
    },
  ];
}

export function mfeBoundaries(root = '') {
  return [
    {
      files: [`${root}src/**/*.{ts,tsx}`],
      rules: restrict(mfeShell, mfeNext, mfeDatabase),
    },
    {
      files: [`${root}src/**/presentation/**/*.{ts,tsx}`],
      rules: restrict(mfeShell, mfeNext, mfeDatabase, presentationInfrastructure),
    },
  ];
}

export function shellBoundaries(root = '') {
  return [
    {
      files: [
        `${root}src/app/**/*.{ts,tsx}`,
        `${root}src/components/**/*.{ts,tsx}`,
        `${root}src/server/http/**/*.{ts,tsx}`,
      ],
      rules: restrict(shellInfrastructure),
    },
  ];
}

export function sharedDeprecations(ignores = []) {
  return [
    {
      files: ['**/*.{ts,tsx}'],
      ignores,
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'warn',
          {
            patterns: Object.entries(movedToCore).map(([target, importNames]) => ({
              group: ['@bytebank/shared', '@bytebank/shared/**'],
              importNames,
              message: `Migrado para o core: importe de '${target}'.`,
            })),
          },
        ],
      },
    },
  ];
}
