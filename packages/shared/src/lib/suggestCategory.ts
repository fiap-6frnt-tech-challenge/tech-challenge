import { CATEGORIES, type CategoryId } from '../categories';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasKeyword(description: string, keyword: string): boolean {
  const normalizedKeyword = normalize(keyword);
  const keywordPattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}($|[^a-z0-9])`);

  return keywordPattern.test(description);
}

export function suggestCategory(description: string): CategoryId | null {
  if (description.trim().length < 3) return null;

  const normalizedDescription = normalize(description);
  const matches = new Set<CategoryId>();

  for (const category of CATEGORIES) {
    if (category.id === 'other') continue;

    for (const keyword of category.keywords) {
      if (hasKeyword(normalizedDescription, keyword)) {
        matches.add(category.id);
        break;
      }
    }
  }

  if (matches.size !== 1) return null;

  return [...matches][0] ?? null;
}
