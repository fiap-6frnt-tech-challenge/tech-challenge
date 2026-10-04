import 'server-only';
import type { Clock } from '@bytebank/core/application';

export class SystemClock implements Clock {
  private readonly calendar: Intl.DateTimeFormat;

  constructor(timeZone: string) {
    this.calendar = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  now(): Date {
    return new Date();
  }

  todayISO(): string {
    const parts = Object.fromEntries(
      this.calendar.formatToParts(this.now()).map(({ type, value }) => [type, value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
}
