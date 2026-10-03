import base from '../shared/eslint.config.mjs';

export default [
  ...base,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'next', 'next/*'],
              message: 'O core não depende de frameworks.',
            },
            {
              group: ['drizzle-orm', 'drizzle-orm/*', '@vercel/blob', 'node:*'],
              message: 'O core não executa IO.',
            },
            { group: ['@bytebank/*'], message: 'O core não depende de outros pacotes Bytebank.' },
          ],
        },
      ],
    },
  },
];
