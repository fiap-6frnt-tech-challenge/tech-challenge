import { describe, expect, it } from 'vitest';

import { Money } from './Money';

describe('Money', () => {
  it('uses zero as the additive identity', () => {
    expect(Money.zero().add(Money.fromDecimal(2.5)).toDecimal()).toBe(2.5);
  });

  it('adds decimal values without floating-point drift', () => {
    const result = Money.fromDecimal(0.1).add(Money.fromDecimal(0.2));

    expect(result.cents).toBe(30);
    expect(result.toDecimal()).toBe(0.3);
  });

  it('subtracts amounts in integer cents', () => {
    const result = Money.fromDecimal(10).subtract(Money.fromDecimal(0.01));

    expect(result.cents).toBe(999);
    expect(result.toDecimal()).toBe(9.99);
  });
});
