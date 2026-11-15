const upward = (layers) => layers.flatMap((layer) => [`**/${layer}`, `**/${layer}/**`]);

const rule = (from, forbidden) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: upward(forbidden),
          message: `Atomic Design: ${from} não pode importar ${forbidden.join(' nem ')}.`,
        },
      ],
    },
  ],
});

export function atomicLayers(root = '') {
  return [
    {
      files: [`${root}src/atoms/**/*.{ts,tsx}`],
      rules: rule('átomo', ['molecules', 'organisms']),
    },
    {
      files: [`${root}src/molecules/**/*.{ts,tsx}`],
      rules: rule('molécula', ['organisms']),
    },
  ];
}
