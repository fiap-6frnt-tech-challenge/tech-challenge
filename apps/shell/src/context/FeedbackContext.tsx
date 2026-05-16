'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import type { FeedbackType } from '@/components/ui/FeedbackModal';

interface ShowFeedbackOptions {
  type: FeedbackType;
  title: string;
  message?: string;
}

interface FeedbackContextValue {
  showFeedback: (options: ShowFeedbackOptions) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ShowFeedbackOptions & { isOpen: boolean }) | null>(null);

  const showFeedback = (options: ShowFeedbackOptions) => {
    setState({ ...options, isOpen: true });
  };

  const hideFeedback = () => {
    setState((prev) => (prev ? { ...prev, isOpen: false } : null));
  };

  return (
    <FeedbackContext.Provider value={{ showFeedback }}>
      {children}
      {state && (
        <FeedbackModal
          isOpen={state.isOpen}
          onClose={hideFeedback}
          type={state.type}
          title={state.title}
          message={state.message}
        />
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}
