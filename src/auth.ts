import NextAuth from "next-auth";
import Spotify from "next-auth/providers/spotify"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { JWT } from "next-auth/jwt";


export const {
    handlers : {GET, POST},
    auth,
    signIn,
    signOut,
} = NextAuth({
    providers: [
        Spotify({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    adapter: SupabaseAdapter({
        url: 'https://njewuwgdbhacyvxoiefm.supabase.co',
        secret: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
    }),

    secret: process.env.NEXT_AUTH_SECRET,
    
    // callbacks: {
    //     async jwt({ token, account }: { token: JWT; account?: any }) {
    //       // Save the access token and refresh token to the token object
    //       if (account) {
    //         token.accessToken = account.access_token;
    //         token.refreshToken = account.refresh_token;
    //         token.accessTokenExpires = Date.now() + account.expires_in * 1000; // Expires in 1 hour
    //       }
    
    //       // If the token has not expired, return it
    //       if (Date.now() < token.accessTokenExpires) {
    //         return token;
    //       }
    
    //       // Else refresh the token
    //       return refreshAccessToken(token);
    //     },
    //     async session({ session, token }: { session: any; token: JWT }) {
    //       session.accessToken = token.accessToken;
    //       session.error = token.error;
    //       return session;
    //     },
    //   },
      callbacks: {
        authorized: async ({ auth }) => {
          // Logged in users are authenticated, otherwise redirect to login page
          return !!auth
        },
      }
    });
    
    // Refresh Spotify access token
    async function refreshAccessToken(token: JWT) {
      try {
        const url = "https://accounts.spotify.com/api/token";
    
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });
    
        const refreshedTokens = await response.json();
    
        if (!response.ok) {
          throw refreshedTokens;
        }
    
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000, // 1 hour expiry
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    }