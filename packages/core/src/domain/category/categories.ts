export const CATEGORIES = [
  {
    id: 'food',
    label: 'Alimentação',
    keywords: ['restaurante', 'pizza', 'mercado', 'ifood', 'lanche', 'refeição', 'almoço'],
  },
  {
    id: 'transport',
    label: 'Transporte',
    keywords: [
      'uber',
      '99',
      'metrô',
      'ônibus',
      'combustível',
      'gasolina',
      'estacionamento',
      'táxi',
    ],
  },
  {
    id: 'leisure',
    label: 'Lazer',
    keywords: ['cinema', 'netflix', 'spotify', 'show', 'jogo', 'ingresso', 'steam'],
  },
  {
    id: 'health',
    label: 'Saúde',
    keywords: ['farmácia', 'médico', 'consulta', 'remédio', 'plano de saúde', 'dentista'],
  },
  {
    id: 'education',
    label: 'Educação',
    keywords: ['curso', 'livro', 'faculdade', 'escola', 'mensalidade', 'fiap'],
  },
  {
    id: 'housing',
    label: 'Moradia',
    keywords: ['aluguel', 'condomínio', 'luz', 'água', 'internet', 'energia', 'gás'],
  },
  {
    id: 'salary',
    label: 'Salário',
    keywords: ['salário', 'pagamento', 'pix recebido', 'holerite', 'freelance'],
  },
  {
    id: 'transfer',
    label: 'Transferência',
    keywords: ['transferência', 'pix enviado', 'ted', 'doc'],
  },
  {
    id: 'other',
    label: 'Outros',
    keywords: [],
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type Category = (typeof CATEGORIES)[number];
