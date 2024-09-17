import NextAuth from "next-auth";
import Spotify from "next-auth/providers/spotify"
import { SupabaseAdapter } from "@auth/supabase-adapter"


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
});
