import { describe, it, expect } from 'vitest';
import uiReducer, { setFilterPanelOpen, toggleFilterPanel } from './uiSlice';

const initialState = { filterPanelOpen: false };

describe('uiSlice', () => {
  it('deve inicializar com valores padrão', () => {
    const state = uiReducer(undefined, { type: '@@INIT' });
    expect(state.filterPanelOpen).toBe(false);
  });

  it('deve alternar o painel de filtros', () => {
    let state = uiReducer(initialState, toggleFilterPanel());
    expect(state.filterPanelOpen).toBe(true);

    state = uiReducer(state, setFilterPanelOpen(false));
    expect(state.filterPanelOpen).toBe(false);
  });
});
