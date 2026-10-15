import { createEntityAdapter, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

export interface Notification extends FeedbackMessage {
  id: string;
  createdAt: number;
}

const adapter = createEntityAdapter<Notification>({
  sortComparer: (a, b) => a.createdAt - b.createdAt,
});

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: adapter.getInitialState(),
  reducers: {
    notificationAdded: {
      reducer: adapter.addOne,
      prepare: (input: FeedbackMessage) => ({
        payload: { ...input, id: nanoid(), createdAt: Date.now() },
      }),
    },
    notificationDismissed: (state, action: PayloadAction<string | undefined>) => {
      const id = action.payload ?? state.ids[0];
      if (id !== undefined) adapter.removeOne(state, id);
    },
  },
});

export const { notificationAdded, notificationDismissed } = notificationsSlice.actions;
type State = { notifications: ReturnType<typeof notificationsSlice.reducer> };
const selectors = adapter.getSelectors((state: State) => state.notifications);
export const selectAllNotifications = selectors.selectAll;
export const selectOldestNotification = (state: State) => {
  const first = state.notifications.ids[0];
  return first === undefined ? null : (state.notifications.entities[first] ?? null);
};

export default notificationsSlice.reducer;
