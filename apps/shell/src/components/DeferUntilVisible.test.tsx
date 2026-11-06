import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DeferUntilVisible } from './DeferUntilVisible';

const render = (eager?: () => boolean) =>
  renderToString(
    <DeferUntilVisible minHeight={640} eager={eager}>
      <p>Dashboard</p>
    </DeferUntilVisible>
  );

describe('DeferUntilVisible', () => {
  it('reserva o espaço e adia os filhos até ficar visível', () => {
    expect(render()).toBe('<div style="min-height:640px"></div>');
  });

  it('continua adiando quando eager devolve false', () => {
    expect(render(() => false)).toBe('<div style="min-height:640px"></div>');
  });

  it('monta os filhos no primeiro render quando eager devolve true', () => {
    expect(render(() => true)).toBe('<div><p>Dashboard</p></div>');
  });
});
