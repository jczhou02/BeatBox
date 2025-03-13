/**
 * Utilities for Spotify API integration
 */

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: string[];
    album: {
      name: string;
      images: { url: string; width: number; height: number }[];
    };
    duration_ms: number;
    preview_url: string | null;
  }
  
  export interface SpotifyPlaylist {
    id: string;
    name: string;
    tracks: {
      items: {
        track: SpotifyTrack;
      }[];
    };
  }
  
  /**
   * Fetch a user's playlists from Spotify
   */
  export async function getUserPlaylists(accessToken: string): Promise<any[]> {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlists: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items;
  }
  
  /**
   * Fetch a specific playlist with its tracks
   */
  export async function getPlaylistWithTracks(accessToken: string, playlistId: string): Promise<SpotifyPlaylist> {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,tracks.items(track(id,name,artists(name),album(name,images),duration_ms,preview_url))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Process Spotify preview URLs to download and prepare for remix DAW
   */
  export async function processSpotifyPreviews(tracks: SpotifyTrack[]): Promise<Blob[]> {
    // In a real implementation, you would:
    // 1. Fetch the preview audio files from Spotify's preview_url
    // 2. Process them and prepare for your DAW system
    // 3. Return actual audio blobs
    
    // This is a mock implementation that simulates fetching previews
    return Promise.all(
      tracks
        .filter(track => track.preview_url) // Only include tracks with previews
        .map(async track => {
          // Simulate fetching the audio file
          // In a real app, you would actually fetch the audio from track.preview_url
          return new Blob([], { type: 'audio/mpeg' }); // Empty blob for demonstration
        })
    );
  }