import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface UIState {
  filterPanelOpen: boolean;
  feedback: FeedbackMessage | null;
}

const initialState: UIState = {
  filterPanelOpen: false,
  feedback: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFilterPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.filterPanelOpen = action.payload;
    },
    toggleFilterPanel: (state) => {
      state.filterPanelOpen = !state.filterPanelOpen;
    },
    showFeedback: (state, action: PayloadAction<FeedbackMessage>) => {
      state.feedback = action.payload;
    },
    hideFeedback: (state) => {
      state.feedback = null;
    },
  },
});

export const { setFilterPanelOpen, toggleFilterPanel, showFeedback, hideFeedback } =
  uiSlice.actions;

export const selectFilterPanelOpen = (state: { ui: UIState }) => state.ui.filterPanelOpen;
export const selectFeedback = (state: { ui: UIState }) => state.ui.feedback;

export default uiSlice.reducer;
