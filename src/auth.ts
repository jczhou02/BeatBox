import NextAuth from 'next-auth';
import "next-auth/jwt"
import SpotifyProvider from 'next-auth/providers/spotify';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { scope } from '@/app/utils/scope';  

export const {handlers, auth, signIn, signOut,} = NextAuth({
  providers: [SpotifyProvider({ authorization: `https://accounts.spotify.com/authorize?scope=${scope}`,})],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secret: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  }),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({token,trigger,session,account}){
        if (trigger === "update") token.name = session.user.name
        if (account) {
          console.log("Account details received, updating token.");
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000;
          return token;
        }
        const expiresAt = token.expiresAt ?? 0;
        console.log("Time until expiration (in hours):", (token.expiresAt - Date.now()) / (1000 * 3600));
        if (Date.now() < expiresAt) {
          console.log("JWT Callback: Token is still valid.");
          return token; // Token still valid
        }
      
        console.log("Access token expired, refreshing...");

        if (token.refreshToken && token.accessToken) {
          return await refreshAccessToken(token);
        } else {
          console.error("Missing refresh or access token. Cannot refresh.");
          return { ...token, error: "MissingTokens" };
        }
    },
    async session({session,token}){
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      } else {
        console.error("Session Callback: Missing accessToken");
      }
      return session
    }
},
});

declare module "next-auth" {
  interface Session {
      accessToken?: string
  }
}

declare module "next-auth/jwt"{
  interface JWT{
      accessToken?: string
      refreshToken?: string;
      expiresAt?: number;
  }
}

async function refreshAccessToken(token: { refreshToken?: string; accessToken?: string }) {
  try {
    if (!token.refreshToken) {
      throw new Error("Missing refresh token");
    }

    const basicAuth = Buffer.from(
      `${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`
    ).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    console.log("Refresh response status:", response.status);
    const data = await response.json();

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }
    console.log("Access token refreshed successfully");
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000, // Update expiry time
      refreshToken: data.refresh_token || token.refreshToken, // Use new refresh token if provided
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
