import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Track } from '@/types/index';

export async function POST(req: Request) {
  try {
    // Parse request body properly
    const { projectId, playlistId, accessToken } = await req.json();

    if (!projectId || !playlistId || !accessToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Placeholder: projects should be retrieved from a database or a data store
    const project = projects.find((p: any) => p.id === projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch playlist tracks from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch playlist from Spotify');
    }

    const data = await response.json();

    const newTracks: Track[] = data.items
      .map((item: any) => {
        // Generate mock waveform data
        const waveformData = Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2);

        return {
          id: uuidv4(),
          name: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', '),
          source: 'spotify',
          fileUrl: item.track.preview_url || '',
          waveformData,
          bpm: project.bpm,
          duration: item.track.duration_ms / 1000,
          color: getRandomColor(),
          isMuted: false,
          isSoloed: false,
        };
      })
      .filter((track: Track) => track.fileUrl);

    // Add tracks to project
    project.tracks.push(...newTracks);
    project.updatedAt = new Date();

    return NextResponse.json(newTracks, { status: 200 });
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    return NextResponse.json({ error: 'Failed to import playlist from Spotify' }, { status: 500 });
  }
}
