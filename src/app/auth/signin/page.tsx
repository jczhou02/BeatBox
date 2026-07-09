// app/auth/signin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignInButton from '@/components/auth/signIn';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // --- KEY CHANGE ---
  // Get the callbackUrl directly from the search params on every render.
  // No need for useState or a separate useEffect.
  // Provide a safe fallback to '/'.
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  useEffect(() => {
    // This effect now has the correct `callbackUrl` from the very beginning.
    if (error === 'OAuthCallbackError') {
      console.log('callbackUrl:', callbackUrl);
      // Add a small delay so the user can see the message.
      const timer = setTimeout(() => {
        // If the user came from the home page, and cancels,
        // redirecting to '/' might be better to avoid a useless refresh.
        // Or just always redirect back.
        router.replace(callbackUrl);
      }, 1500); // 1.5 second delay

      // Cleanup the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  }, [error, callbackUrl, router]); // Dependencies are correct

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>

      {/* Show the cancellation message instead of the sign-in button */}
      {error === 'OAuthCallbackError' ? (
        <p className="mt-4 text-gray-600">
          You cancelled sign‑in. Redirecting you back...
        </p>
      ) : (
        <SignInButton />
      )}
    </div>
  );
}