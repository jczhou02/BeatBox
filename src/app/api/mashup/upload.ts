import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Track } from '../../../types';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  
  const form = new formidable.IncomingForm({
    uploadDir: path.join(process.cwd(), 'public/uploads'),
    keepExtensions: true,
  });
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing form data' });
    }
    
    const projectId = fields.projectId as string;
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const audioFiles = Array.isArray(files.audioFiles) 
      ? files.audioFiles 
      : [files.audioFiles];
    
    const newTracks: Track[] = [];
    
    for (const file of audioFiles) {
      if (!file) continue;
      
      // Generate mock waveform data
      const waveformData = Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2);
      
      const track: Track = {
        id: uuidv4(),
        name: path.basename(file.originalFilename || 'Untitled', path.extname(file.originalFilename || '')),
        source: 'upload',
        fileUrl: `/uploads/${path.basename(file.filepath)}`,
        waveformData,
        bpm: project.bpm,
        duration: 180, // Mock duration in seconds
        color: getRandomColor(),
        isMuted: false,
        isSoloed: false
      };
      
      newTracks.push(track);
    }
    
    // Add tracks to project
    project.tracks.push(...newTracks);
    project.updatedAt = new Date();
    
    return res.status(200).json(newTracks);
  });
}

function getRandomColor() {
  const colors = [
    '#FF4081', // Pink
    '#7C4DFF', // Purple
    '#00E5FF', // Cyan
    '#76FF03', // Light Green
    '#FF9100', // Orange
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}
