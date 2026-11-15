import { describe, expect, it } from 'vitest';
import { defaultSummaryRange } from './summaryRange';

describe('defaultSummaryRange', () => {
  it('covers the current month and the five before it', () => {
    expect(defaultSummaryRange(new Date('2026-06-15T12:00:00Z'))).toEqual({
      from: '2026-01-01',
      to: '2026-06-15',
    });
  });

  it('keeps the São Paulo date between 21h and midnight, when UTC is already tomorrow', () => {
    expect(defaultSummaryRange(new Date('2026-06-16T01:30:00Z'))).toEqual({
      from: '2026-01-01',
      to: '2026-06-15',
    });
  });

  it('starts the new month at São Paulo midnight, not UTC midnight', () => {
    expect(defaultSummaryRange(new Date('2026-07-01T02:59:59Z')).to).toBe('2026-06-30');
    expect(defaultSummaryRange(new Date('2026-07-01T03:00:00Z'))).toEqual({
      from: '2026-02-01',
      to: '2026-07-01',
    });
  });

  it('crosses the year boundary', () => {
    expect(defaultSummaryRange(new Date('2026-03-10T15:00:00Z'))).toEqual({
      from: '2025-10-01',
      to: '2026-03-10',
    });
  });
});
