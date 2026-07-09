'use client';

import { FeedbackModal } from '@bytebank/design-system';
import { hideFeedback, selectFeedback, useAppDispatch, useAppSelector } from '@bytebank/stores';

export function FeedbackHost() {
  const feedback = useAppSelector(selectFeedback);
  const dispatch = useAppDispatch();

  return (
    <FeedbackModal
      isOpen={feedback !== null}
      onClose={() => dispatch(hideFeedback())}
      type={feedback?.type ?? 'info'}
      title={feedback?.title ?? ''}
      message={feedback?.message}
    />
  );
}
