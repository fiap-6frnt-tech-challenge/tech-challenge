import type {
  AuditEvent,
  AuditLogger,
  CacheEntry,
  CacheInvalidator,
  Clock,
  IdGenerator,
  OwnedResource,
  ResourceOwnership,
  ResultCache,
} from '../ports';

export class FakeCacheInvalidator implements CacheInvalidator {
  readonly invalidated: string[] = [];
  async invalidateUser(userId: string): Promise<void> {
    this.invalidated.push(userId);
  }
}

export class InMemoryResultCache implements ResultCache {
  private readonly entries = new Map<string, { value: unknown; tags: readonly string[] }>();
  hits = 0;

  async remember<T>({ key, tags }: CacheEntry, load: () => Promise<T>): Promise<T> {
    const id = JSON.stringify(key);
    const cached = this.entries.get(id);
    if (cached) {
      this.hits += 1;
      return cached.value as T;
    }
    const value = await load();
    this.entries.set(id, { value, tags });
    return value;
  }

  invalidateTag(tag: string): void {
    for (const [id, entry] of this.entries) if (entry.tags.includes(tag)) this.entries.delete(id);
  }

  keys(): string[][] {
    return [...this.entries.keys()].map((id) => JSON.parse(id));
  }
}

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

export class MemoryAuditLogger implements AuditLogger {
  readonly events: AuditEvent[] = [];
  record(event: AuditEvent): void {
    this.events.push(event);
  }
}

export class MemoryResourceOwnership implements ResourceOwnership {
  constructor(
    private readonly owners: Partial<Record<OwnedResource, Record<string, string>>> = {}
  ) {}
  async ownerOf(resource: OwnedResource, id: string): Promise<string | null> {
    return this.owners[resource]?.[id] ?? null;
  }
}
