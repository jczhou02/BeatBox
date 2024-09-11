import NextAuth from "next-auth";
//import "next-auth/jwt"
//import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google";
import Spotify from "next-auth/providers/spotify"

export const {
    handlers : {GET, POST},
    auth,
    signIn,
    signOut,
} = NextAuth({
    providers: [
        Google({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_ID,
            clientSecret: process.env.NEXT_PUBLIC_GOOGLE_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
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
});
