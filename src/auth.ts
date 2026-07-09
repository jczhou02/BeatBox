import NextAuth, { DefaultSession } from 'next-auth';
import "next-auth/jwt"
import SpotifyProvider from 'next-auth/providers/spotify';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { scope } from '@/app/utils/scope';  

export const {handlers, auth, signIn, signOut,} = NextAuth({
  providers: [SpotifyProvider({ authorization: `https://accounts.spotify.com/authorize?scope=${scope}`,})],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    secret: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY || '',
  }),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;

      // Fallback to a safe default if the redirect URL is not from your domain.
      console.warn(`Redirect URL ${url} is not from the same origin as baseUrl ${baseUrl}. Redirecting to baseUrl.`);
      return baseUrl;
    },

    async jwt({token,user,trigger,session,account}){
        if (trigger === "update") token.name = session.user.name
        if (account && user) {
          console.log(`Account details received for ${user.name}, updating token.`);
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000;
          token.id = user.id;
          return token;
        }
        const expiresAt = token.expiresAt ?? 0;
        //console.log("Time until expiration (in hours):", (token.expiresAt - Date.now()) / (1000 * 3600));
        if (Date.now() < expiresAt) {
          console.log(`JWT Callback: Token is still valid.`);
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
        session.accessToken = token.accessToken as string;
      } 
      if (token.sub) { // `token.sub` is the standard JWT property for user ID
        session.user.id = token.sub;
      }
      
      return session;
    }
},
});

declare module "next-auth" {
  interface Session {
      accessToken?: string
      user: {
          id?: string; 
      } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt"{
  interface JWT{
      accessToken?: string
      refreshToken?: string;
      expiresAt?: number;
      id?: string; 
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
