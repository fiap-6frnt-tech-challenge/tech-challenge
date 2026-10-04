'use client';

import { useEffect } from 'react';

// When the iOS soft keyboard closes, Safari leaves a ghost scroll offset on the
// window that causes a blank space at the bottom. Resetting it on every
// visualViewport resize (which fires reliably on keyboard open/close) clears it.
export function ViewportFix() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const onResize = () => window.scrollTo(0, 0);

    viewport.addEventListener('resize', onResize);
    return () => viewport.removeEventListener('resize', onResize);
  }, []);

  return null;
}
