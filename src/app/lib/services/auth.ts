import SpotifyProvider from 'next-auth/providers/spotify';
import { scope } from '@/app/utils/scope';  

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.AUTH_SPOTIFY_ID,
      clientSecret: process.env.AUTH_SPOTIFY_SECRET,
      authorization:
        `https://accounts.spotify.com/authorize?scope=${scope}`,
    }),
  ],
  secret: process.env.AUTH_SECRET,
};
