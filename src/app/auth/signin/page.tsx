// app/auth/signin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignInButton from '@/components/auth/signIn';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // Retrieve callbackUrl from query or local storage, default to '/'
  const queryCallbackUrl = searchParams.get('callbackUrl');
  const [callbackUrl, setCallbackUrl] = useState<string>('/');

  useEffect(() => {
    if (queryCallbackUrl) {
      setCallbackUrl(queryCallbackUrl);
    } else {
      const storedUrl = localStorage.getItem('callbackUrl');
      setCallbackUrl(storedUrl || '/');
    }
  }, [queryCallbackUrl]);

  useEffect(() => {
    if (error === 'OAuthCallbackError') {
      // Redirect back after a brief delay (or immediately)
      router.replace(callbackUrl);
    }
  }, [error, callbackUrl, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      <SignInButton />
      {error === 'OAuthCallbackError' && (
        <p className="mt-4 text-gray-600">
          You cancelled sign‑in. Redirecting you back...
        </p>
      )}
    </div>
  );
}
