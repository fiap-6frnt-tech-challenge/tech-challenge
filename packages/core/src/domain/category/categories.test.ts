import { describe, expect, it } from 'vitest';

import { CATEGORIES, categoryLabel } from './categories';

describe('categoryLabel', () => {
  it('maps every category id to its Portuguese label', () => {
    for (const { id, label } of CATEGORIES) {
      expect(categoryLabel(id)).toBe(label);
    }
  });

  it('keeps legacy values stored as labels or unknown names', () => {
    expect(categoryLabel('Alimentação')).toBe('Alimentação');
    expect(categoryLabel('Presentes')).toBe('Presentes');
  });
});
