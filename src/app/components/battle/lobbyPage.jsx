'use client';

import { useSession, signIn } from 'next-auth/react';

export default function Lobby({onStartBattle}) {
  const { data: session, status } = useSession();

  return (
    <div className="p-8 text-center">
      <h1>Welcome to the Battle Arena!</h1>
      <p>Prepare to test your music knowledge in a head-to-head showdown.</p>

      <h2 className="mt-4">How the Battle Works</h2>
      <ul className="text-left mx-auto max-w-md">
        <li>🎵 Select a song with at least one featured artist.</li>
        <li>🎶 Your opponent must respond with another song featuring that artist.</li>
        <li>💥 Songs can be used up to three times, so choose wisely!</li>
      </ul>

      {status === 'loading' ? (
        <p>Loading...</p>
      ) : session ? (
        <button onClick={onStartBattle} className="mt-6 bg-blue-500 text-white px-4 py-2 rounded">
          Start a Battle!
        </button>
      ) : (
        <button
          onClick={() => signIn('spotify')}
          className="mt-6 bg-green-500 text-white px-4 py-2 rounded"
        >
          Login with Spotify to Battle
        </button>
      )}
    </div>
  );
}
