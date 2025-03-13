import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  const { projectId, playlistId, accessToken } = req.body;
  
  if (!projectId || !playlistId || !accessToken) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    // Fetch playlist tracks from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlist from Spotify');
    }
    
    const data = await response.json();
    
    const newTracks: Track[] = data.items.map((item: any) => {
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
        isSoloed: false
      };
    }).filter((track: Track) => track.fileUrl);
    
    // Add tracks to project
    project.tracks.push(...newTracks);
    project.updatedAt = new Date();
    
    return res.status(200).json(newTracks);
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    return res.status(500).json({ error: 'Failed to import playlist from Spotify' });
  }
}