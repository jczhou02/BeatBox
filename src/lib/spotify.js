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
].join(",");

const params = {
  scope: scopes,
};

const queryParamString = new URLSearchParams(params);
const LOGIN_URL = `https://accounts.spotify.com/authorize?${queryParamString.toString()}`;

export { spotifyApi, LOGIN_URL };
