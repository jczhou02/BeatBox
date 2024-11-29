// beatbox/src/app/home/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);

  useEffect(() => {
    // If the session is authenticated, fetch Spotify data
    if (status === 'authenticated' && session?.accessToken) {
      fetchTopTracks();
      fetchTopArtists();
    }
  }, [status, session]);

  if (status === 'unauthenticated') {
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
      } else {
        console.error('Unexpected response for top tracks:', data);
        setTopTracks([]); // Set to empty array to avoid undefined state
      }
    } catch (error) {
      console.error('Error fetching top tracks:', error);
      setTopTracks([]); // Set to empty array in case of error
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
      } else {
        console.error('Unexpected response for top artists:', data);
        setTopArtists([]); // Set to empty array to avoid undefined state
      }
    } catch (error) {
      console.error('Error fetching top artists:', error);
      setTopArtists([]); // Set to empty array in case of error
    }
  };
  

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p>You need to sign in to access this page.</p>
        <button onClick={() => signIn('spotify')} className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
          Sign in with Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 text-center">
      <h1>Welcome, {session?.user?.name}!</h1>
      <p>Your Spotify email: {session?.user?.email}</p>

      <div className="my-6">
        <h2>Your Top Tracks</h2>
        {topTracks && topTracks.length > 0 ? (
          <ul>
            {topTracks.map((track, index) => (
              <li key={track.id} className="my-2">
                {index + 1}. {track.name} by {track.artists.map(artist => artist.name).join(', ')}
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
  );
}
