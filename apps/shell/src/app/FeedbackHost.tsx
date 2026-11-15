'use client';

import { FeedbackModal } from '@bytebank/design-system';
import {
  hideFeedback,
  selectFeedback,
  selectHasPendingUploads,
  useAppDispatch,
  useAppSelector,
} from '@bytebank/stores';

export function FeedbackHost() {
  const feedback = useAppSelector(selectFeedback);
  const dispatch = useAppDispatch();
  const hasPendingUploads = useAppSelector(selectHasPendingUploads);

  return (
    <FeedbackModal
      isOpen={feedback !== null && !(feedback.type === 'success' && hasPendingUploads)}
      onClose={() => dispatch(hideFeedback(feedback?.id))}
      type={feedback?.type ?? 'info'}
      title={feedback?.title ?? ''}
      message={feedback?.message}
    />
  );
}
