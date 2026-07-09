import { Suspense } from 'react';
import { AuthErrorContent } from './AuthErrorContent';

function AuthErrorFallback() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-dvh flex items-center justify-center bg-background px-md py-xl"
    >
      <section className="h-48 w-full max-w-[28rem] rounded-md border border-border bg-surface p-xl shadow-sm" />
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}
