'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Header from '@/components/layout/header';
import SignInButton from '@/components/auth/signIn';

export default function Home() {
  const { data: session, status } = useSession();
  const [topTracks, setTopTracks] = useState<{ id: string; name: string; artists: { name: string }[] }[]>([]);
  const [topArtists, setTopArtists] = useState<{ id: string; name: string }[]>([]);

  const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      const now = Date.now();

      // Check localStorage for cached data and last fetch timestamp
      const cachedTracks = localStorage.getItem('topTracks') ? JSON.parse(localStorage.getItem('topTracks') as string) : null;
      const cachedArtists = localStorage.getItem('topArtists') ? JSON.parse(localStorage.getItem('topArtists') as string) : null;
      const lastFetched = localStorage.getItem('lastFetched') ? parseInt(localStorage.getItem('lastFetched') as string, 10) : null;

      // If data is outdated (or missing), fetch fresh data
      if (!cachedTracks || !cachedArtists || !lastFetched || now - lastFetched > WEEK_IN_MS) {
        console.log('Fetching fresh data from Spotify API...');
        fetchTopTracks();
        fetchTopArtists();
        localStorage.setItem('lastFetched', now.toString()); // Update timestamp
      } else {
        console.log('Loading cached data...');
        setTopTracks(cachedTracks);
        setTopArtists(cachedArtists);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  const fetchTopTracks = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5', {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data.items)) {
        setTopTracks(data.items);
        localStorage.setItem('topTracks', JSON.stringify(data.items)); // Cache in localStorage
      } else {
        console.error('Unexpected response for top tracks:', data);
        setTopTracks([]);
      }
    } catch (error) {
      console.error('Error fetching top tracks:', error);
      setTopTracks([]);
    }
  };

  const fetchTopArtists = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok && Array.isArray(data.items)) {
        setTopArtists(data.items);
        localStorage.setItem('topArtists', JSON.stringify(data.items)); // Cache in localStorage
      } else {
        console.error('Unexpected response for top artists:', data);
        setTopArtists([]);
      }
    } catch (error) {
      console.error('Error fetching top artists:', error);
      setTopArtists([]);
    }
  };

  if (status === 'unauthenticated') {
    return (
      <div className="text-center p-8">
          <h1 className="text-xl font-semibold mb-4">
            You need to sign in to access your homepage.
          </h1>
          <div className="flex justify-center">
            <SignInButton />
          </div>
        </div>
    );
  }

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p>You need to sign in to access this page.</p>
        <button
          onClick={() => signIn('spotify')}
          className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
        >
          Sign in with Spotify
        </button>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="p-8 text-center">
        <h1>Welcome, {session?.user?.name}!</h1>
        <p>Your Spotify email: {session?.user?.email}</p>

        <div className="my-6">
          <h2>Your Top Tracks</h2>
          {topTracks && topTracks.length > 0 ? (
            <ul>
              {topTracks.map((track, index) => (
                <li key={track.id} className="my-2">
                  {index + 1}. {track.name} by{' '}
                  {track.artists.map((artist) => artist.name).join(', ')}
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading top tracks...</p>
          )}
        </div>

        <div className="my-6">
          <h2>Your Top Artists</h2>
          {Array.isArray(topArtists) && topArtists.length > 0 ? (
            <ul>
              {topArtists.map((artist, index) => (
                <li key={artist.id} className="my-2">
                  {index + 1}. {artist.name}
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading top artists...</p>
          )}
        </div>
      </div>
    </div>
  );
}
