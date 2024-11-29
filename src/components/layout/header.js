// beatbox/src/components/layout/Header.js
'use client';

import { useSession } from 'next-auth/react';
import ToggleDarkMode from './darkmodetoggle';
import { signOut } from 'next-auth/react';

const Header = () => {
  const { data: session } = useSession();

  return (
    <div className="border-b-4 border-black flex justify-between items-center px-4">
      <div className="text-lg">
        {session
          ? `Welcome to BeatBox, ${session.user.name}! Prepare for battle 😈🎵`
          : 'Welcome to BeatBox! Please sign into your Spotify account and prepare for battle 🎵'}
      </div>
      <div className="ml-auto flex items-center space-x-4">
        <ToggleDarkMode />
        {session && (
          <button onClick={() => signOut({ callbackUrl: '/' })} className="bg-red-500 text-white px-3 py-1 rounded">
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
