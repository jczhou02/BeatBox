// beatbox/src/components/auth/SignInButton.tsx
'use client';
import { signIn } from 'next-auth/react';
import { FC } from 'react';
import {scope} from '@/app/utils/scope';

const SignInButton: FC = () => {
  const handleSignIn = () => {
    signIn('spotify',{},
    {
      scope:scope,
      response_type: "code",
    });
  };

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-75"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 168 168"
        width="24"
        height="24"
        className="mr-2"
      >
        <path
          fill="#1DB954"
          d="M168 84a84 84 0 1 0-84 84 84 84 0 0 0 84-84"
        />
        <path
          fill="#fff"
          d="M124.5 118.6a6.7 6.7 0 0 1-9.3 2.1c-25.5-15.7-57.7-19.2-95.3-10.5a6.7 6.7 0 0 1-3.2-12.9c39.7-9.9 74.5-6.1 102.2 12.3a6.7 6.7 0 0 1 2.2 9zm11.4-24a8.1 8.1 0 0 1-11.2 2.4c-28.2-17.3-71.4-22.3-104.9-12.1a8.1 8.1 0 1 1-4.7-15.5c37.5-11.3 85.2-6 117.1 13.5a8.1 8.1 0 0 1 2.5 11.2zm9-25.2c-33.4-20.7-88.2-22.5-119-12.1a9.5 9.5 0 1 1-5.6-18.2c33.4-10.3 93.6-8.3 131.4 14a9.5 9.5 0 0 1-9.8 16.2z"
        />
      </svg>
      Sign in with Spotify
    </button>
  );
};

export default SignInButton;
