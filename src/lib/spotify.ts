import { SpotifyPlaylist, SpotifyTrack } from '../types';
import SpotifyWebApi from "spotify-web-api-node";

// Initialize the Spotify Web API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/api/auth/callback/spotify", // Use environment variable for production
});

const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "playlist-read-private", 
  "playlist-read-collaborative",
].join(",");

const params = {
  scope: scopes,
};

const queryParamString = new URLSearchParams(params);
const LOGIN_URL = `https://accounts.spotify.com/authorize?${queryParamString.toString()}`;

export { spotifyApi, LOGIN_URL };




  export async function getUserPlaylists(accessToken: string): Promise<any[]> {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?fields=items(id,images,tracks(total))', { 
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