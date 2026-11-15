export const SUMMARY_TIME_ZONE = 'America/Sao_Paulo';
export const SUMMARY_MONTHS = 6;

export interface SummaryDateRange {
  from: string;
  to: string;
}

const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: SUMMARY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function defaultSummaryRange(now: Date = new Date()): SummaryDateRange {
  const to = calendar.format(now);
  const [year, month] = to.split('-').map(Number);
  const from = new Date(Date.UTC(year, month - SUMMARY_MONTHS, 1)).toISOString().slice(0, 10);
  return { from, to };
}
