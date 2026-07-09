const ABBREVIATIONS = [
  { threshold: 1e12, suffix: ' tri' },
  { threshold: 1e9, suffix: ' bi' },
  { threshold: 1e6, suffix: ' mi' },
  { threshold: 1e3, suffix: ' mil' },
];

export function formatCurrency(value: number, showSuffix = false): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (showSuffix) {
    for (const { threshold, suffix } of ABBREVIATIONS) {
      if (abs >= threshold) {
        const shortened = abs / threshold;
        const formatted = shortened.toLocaleString('pt-BR', {
          minimumFractionDigits: shortened % 1 === 0 ? 0 : 1,
          maximumFractionDigits: 1,
        });
        return `${sign}R$ ${formatted}${suffix}`;
      }
    }
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatCurrencyExact(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return `${formatted} ${units[exponent]}`;
}

export function formatDate(dateStr: string | Date): string {
  if (typeof dateStr === 'string') {
    dateStr = `${dateStr}T00:00:00`;
  }

  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function formatTodayDate(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const date = formatDate(now);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${date}`;
}
