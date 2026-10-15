import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  filterPanelOpen: boolean;
}

const initialState: UIState = {
  filterPanelOpen: false,
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
  },
});

export const { setFilterPanelOpen, toggleFilterPanel } = uiSlice.actions;

export const selectFilterPanelOpen = (state: { ui: UIState }) => state.ui.filterPanelOpen;
export {
  notificationAdded as showFeedback,
  notificationDismissed as hideFeedback,
  selectOldestNotification as selectFeedback,
} from './notificationsSlice';
export type { FeedbackMessage } from './notificationsSlice';

export default uiSlice.reducer;
