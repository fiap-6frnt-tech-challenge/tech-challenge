import { describe, it, expect } from 'vitest';
import uiReducer, {
  setFilterPanelOpen,
  toggleFilterPanel,
  showFeedback,
  hideFeedback,
} from './uiSlice';

const initialState = { filterPanelOpen: false, feedback: null };

describe('uiSlice', () => {
  it('deve inicializar com valores padrão', () => {
    const state = uiReducer(undefined, { type: '@@INIT' });
    expect(state.filterPanelOpen).toBe(false);
    expect(state.feedback).toBeNull();
  });

  it('deve alternar o painel de filtros', () => {
    let state = uiReducer(initialState, toggleFilterPanel());
    expect(state.filterPanelOpen).toBe(true);

    state = uiReducer(state, setFilterPanelOpen(false));
    expect(state.filterPanelOpen).toBe(false);
  });

  it('deve gerenciar feedbacks com sucesso', () => {
    const feedbackPayload = { type: 'success' as const, title: 'Sucesso', message: 'Tudo OK' };

    let state = uiReducer(initialState, showFeedback(feedbackPayload));
    expect(state.feedback).toEqual(feedbackPayload);

    state = uiReducer(state, hideFeedback());
    expect(state.feedback).toBeNull();
  });
});
