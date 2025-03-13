import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  // Mock database operation
  const project = projects.find(p => p.id === id);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  if (req.method === 'GET') {
    return res.status(200).json(project);
  } else if (req.method === 'PATCH') {
    const updates = req.body;
    
    Object.assign(project, {
      ...updates,
      updatedAt: new Date()
    });
    
    return res.status(200).json(project);
  } else if (req.method === 'DELETE') {
    projects = projects.filter(p => p.id !== id);
    
    return res.status(204).end();
  }
  
  return res.status(405).end();
}
