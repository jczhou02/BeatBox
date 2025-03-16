'use client';

import { useSession, signOut } from 'next-auth/react';
import ToggleSound from './toggleSound';

const Header = () => {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    // 1. If a Spotify access token exists, revoke it on the server.
    // if (session?.user?.accessToken) {
    //   try {
    //     await fetch('/api/spotify/revoke', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json'
    //       },
    //       body: JSON.stringify({ token: session.user.accessToken })
    //     });
    //     console.log('Spotify token revoked.');
    //   } catch (error) {
    //     console.error('Error revoking Spotify token:', error);
    //   }
    // }

    // 2. Clear any stored tokens (if you're storing them locally).
    localStorage.removeItem('spotifyAccessToken');

    // 3. (Optional) Disconnect the Spotify Web Playback SDK.
    // If you keep a global reference to your Spotify player,
    // call player.disconnect() here.

    // 4. Finally, call next-auth's signOut.
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="border-b-4 border-black flex justify-between items-center px-4">
      <div className="text-lg">
        {session
          ? `Welcome to BeatBox, ${session.user.name}! Prepare for battle 😈🎵`
          : 'Welcome to BeatBox! Please sign into your Spotify account and prepare for battle 🎵'}
      </div>
      <div className="ml-auto flex items-center space-x-4">
        <ToggleSound />
        {session && (
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
