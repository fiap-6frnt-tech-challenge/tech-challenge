/** A monetary amount represented in integer cents. */
export class Money {
  private constructor(readonly cents: number) {}

  static fromDecimal(value: number): Money {
    return new Money(Math.round(value * 100));
  }

  static zero(): Money {
    return new Money(0);
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  toDecimal(): number {
    return this.cents / 100;
  }
}
