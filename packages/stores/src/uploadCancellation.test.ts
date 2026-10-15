import { describe, expect, it } from 'vitest';
import { cancelPendingUploads, registerUploadCancellation } from './uploadCancellation';

describe('upload cancellation registry', () => {
  it('cancels every mounted queue and unregisters queues on cleanup', () => {
    const cancelled: string[] = [];
    const stopA = registerUploadCancellation(() => cancelled.push('a'));
    const stopB = registerUploadCancellation(() => cancelled.push('b'));
    stopA();
    cancelPendingUploads();
    expect(cancelled).toEqual(['b']);
    stopB();
    cancelPendingUploads();
    expect(cancelled).toEqual(['b']);
  });
});
