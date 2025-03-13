import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../../../types';

// Mock database
let projects: Project[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(projects);
  } else if (req.method === 'POST') {
    const { name, bpm = 120 } = req.body;
    
    const newProject: Project = {
      id: uuidv4(),
      name,
      bpm,
      tracks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    projects.push(newProject);
    
    return res.status(201).json(newProject);
  }
  
  return res.status(405).end();
}