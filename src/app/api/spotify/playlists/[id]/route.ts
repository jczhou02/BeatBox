// src/app/api/spotify/playlists/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getPlaylistWithTracks } from '@/lib/spotify';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const { id } = params;
  console.log(`Fetching playlist with ID: ${id}`);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
  }

  try {
    // Note: The getPlaylistWithTracks function is perfect for this.
    const playlist = await getPlaylistWithTracks(session.accessToken, id);
    return NextResponse.json(playlist);
  } catch (error: any) {
    console.error(`Failed to fetch playlist ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch playlist details' },
      { status: 500 }
    );
  }
}