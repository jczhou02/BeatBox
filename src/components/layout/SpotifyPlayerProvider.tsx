// src/components/layout/SongTabPlayback.tsx
import React, { memo } from 'react';
import { useSession } from 'next-auth/react';
import { useSpotifyPlayer } from '@/context/SpotifyPlayerProvider';

interface Track {
  id?: string;
  name: string;
  artists: Array<{ name: string }>;
  uri?: string;
}

interface SongTabPlaybackProps {
  track: Track;
}

const SongTabPlaybackComponent = ({ track }: SongTabPlaybackProps) => {
  const { data: session } = useSession();
  const user = session?.user as { product?: string } | undefined;
  const isPremium = user?.product === "premium";
  const { togglePlay } = useSpotifyPlayer();

  const handleToggle = () => {
    if (!track.uri) return;
    togglePlay(track.uri);
  };

  // Non-premium fallback: use Spotify Embed API
  const SpotifyEmbedPlayer = ({ trackUri }: { trackUri: string }) => {
    if (!trackUri) return <p className="text-gray-500">No track available</p>;
    const trackId = trackUri.split(":").pop(); // Extract Spotify track ID
    return (
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator`}
        width="100%"
        height="80"
        allow="encrypted-media"
      ></iframe>
    );
  };

  return (
    <div>
      {isPremium ? (
        <div>
          <p className="text-sm text-gray-400 mb-1">Premium playback enabled</p>
          <button onClick={handleToggle} className="px-3 py-1 bg-green-500 text-white rounded">
            Toggle Play/Pause
          </button>
        </div>
      ) : (
        <SpotifyEmbedPlayer trackUri={track.uri || ""} />
      )}
    </div>
  );
};

// Memoize to avoid unnecessary re-renders when props don't change
export const SongTabPlayback = memo(SongTabPlaybackComponent);
