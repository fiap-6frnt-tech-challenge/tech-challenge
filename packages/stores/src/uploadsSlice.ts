import {
  createEntityAdapter,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';
export interface UploadMetadata {
  id: string;
  transactionId: string;
  fileName: string;
  loaded: number;
  total: number;
  status: UploadStatus;
  error?: string;
}

const adapter = createEntityAdapter<UploadMetadata>();
export const uploadsSlice = createSlice({
  name: 'uploads',
  initialState: adapter.getInitialState(),
  reducers: {
    uploadQueued: adapter.upsertOne,
    uploadStarted: (state, { payload: id }: PayloadAction<string>) => {
      const item = state.entities[id];
      if (item) {
        item.status = 'uploading';
        delete item.error;
      }
    },
    uploadProgress: (
      state,
      { payload }: PayloadAction<{ id: string; loaded: number; total: number }>
    ) => {
      const item = state.entities[payload.id];
      if (!item || !['queued', 'uploading'].includes(item.status)) return;
      item.status = 'uploading';
      item.total = Math.max(0, payload.total || item.total);
      item.loaded = Math.max(0, Math.min(payload.loaded, item.total));
    },
    uploadCompleted: (state, { payload: id }: PayloadAction<string>) => {
      const item = state.entities[id];
      if (item) {
        item.status = 'done';
        item.loaded = item.total;
        delete item.error;
      }
    },
    uploadFailed: (state, { payload }: PayloadAction<{ id: string; message: string }>) => {
      const item = state.entities[payload.id];
      if (item) {
        item.status = 'failed';
        item.error = payload.message;
      }
    },
    uploadCancelled: (state, { payload: id }: PayloadAction<string>) => {
      const item = state.entities[id];
      if (item) item.status = 'cancelled';
    },
    uploadsRemoved: adapter.removeMany,
  },
});

export const {
  uploadQueued,
  uploadStarted,
  uploadProgress,
  uploadCompleted,
  uploadFailed,
  uploadCancelled,
  uploadsRemoved,
} = uploadsSlice.actions;
type State = { uploads: ReturnType<typeof uploadsSlice.reducer> };
export const { selectAll: selectAllUploads } = adapter.getSelectors(
  (state: State) => state.uploads
);
export const selectActiveUploads = createSelector([selectAllUploads], (uploads) =>
  uploads.filter((item) => item.status === 'uploading')
);
export const selectHasPendingUploads = createSelector([selectAllUploads], (uploads) =>
  uploads.some((item) => item.status === 'queued' || item.status === 'uploading')
);
export const selectOverallUploadProgress = createSelector([selectActiveUploads], (uploads) => {
  const total = uploads.reduce((sum, item) => sum + item.total, 0);
  return total === 0 ? null : uploads.reduce((sum, item) => sum + item.loaded, 0) / total;
});

export default uploadsSlice.reducer;
