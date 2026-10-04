import type { Clock, IdGenerator } from '../ports';

export class FakeClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  todayISO(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(this.current);
  }
  set(date: Date): void {
    this.current = new Date(date);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private sequence = 0;
  constructor(private readonly prefix = 'id') {}
  next(): string {
    this.sequence += 1;
    return `${this.prefix}-${this.sequence}`;
  }
}
