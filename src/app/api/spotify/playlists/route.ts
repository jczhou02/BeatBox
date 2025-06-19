// src/app/api/spotify/playlists/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth'; // Assuming your next-auth config is in auth.ts
import { getUserPlaylists } from '@/lib/spotify';

export async function GET() {
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const playlists = await getUserPlaylists(session.accessToken);
    return NextResponse.json(playlists);
  } catch (error: any) {
    console.error('Failed to fetch user playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user playlists' },
      { status: 500 }
    );
  }
}