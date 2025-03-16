// src/context/SpotifyPlayerProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyUser {
  accessToken?: string;
  product?: string;
}

interface SpotifyPlayerContextProps {
  playerRef: React.MutableRefObject<any>;
  deviceId: string | null;
  isPlaying: boolean;
  togglePlay: (uri: string) => Promise<void>;
}

const SpotifyPlayerContext = createContext<SpotifyPlayerContextProps | undefined>(undefined);

export const SpotifyPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session } = useSession();
  const user = session?.user as SpotifyUser | undefined;
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Only initialize for premium users.
    if (user?.product !== 'premium') return;

    if (window.Spotify) {
      initializePlayer();
    } else {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onload = () => {
        window.onSpotifyWebPlaybackSDKReady = initializePlayer;
      };
      document.body.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function initializePlayer() {
    if (!user?.accessToken) {
      console.error('Spotify access token is missing.');
      return;
    }
    const player = new window.Spotify.Player({
      name: 'My Web Player',
      getOAuthToken: (cb: (token: string) => void) => cb(user.accessToken as string),
      volume: 0.5,
    });

    player.addListener('ready', ({ device_id }: { device_id: string }) => {
      setDeviceId(device_id);
      console.log('Spotify Player Ready with Device ID:', device_id);
    });

    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify Player has gone offline:', device_id);
    });

    player.addListener('player_state_changed', (state: any) => {
      if (!state) return;
      setIsPlaying(!state.paused);
    });

    player.connect();
    playerRef.current = player;
  }

  async function togglePlay(uri: string): Promise<void> {
    if (!playerRef.current || !deviceId || !user?.accessToken) return;
    if (isPlaying) {
      await playerRef.current.pause();
      setIsPlaying(false);
    } else {
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: [uri] })
      });
      if (res.ok) {
        setIsPlaying(true);
      } else {
        console.error('Error starting playback:', await res.json());
      }
    }
  }

  return (
    <SpotifyPlayerContext.Provider value={{ playerRef, deviceId, isPlaying, togglePlay }}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
};

export const useSpotifyPlayer = () => {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error('useSpotifyPlayer must be used within a SpotifyPlayerProvider');
  }
  return context;
};
