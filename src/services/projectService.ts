import { Project, Track } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mock database - in a real app, this would be replaced with a real database
let projects: Project[] = [];

/**
 * Create a new remix project
 */
export function createProject(name: string, bpm: number = 120): Project {
  const newProject: Project = {
    id: uuidv4(),
    name,
    bpm,
    tracks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  projects.push(newProject);
  return newProject;
}

/**
 * Get a project by its ID
 */
export function getProject(id: string): Project | undefined {
  return projects.find(p => p.id === id);
}

/**
 * Get all projects
 */
export function getAllProjects(): Project[] {
  return [...projects];
}

/**
 * Update a project
 */
export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Project | undefined {
  const project = projects.find(p => p.id === id);
  
  if (!project) {
    return undefined;
  }
  
  Object.assign(project, {
    ...updates,
    updatedAt: new Date()
  });
  
  return project;
}

/**
 * Delete a project
 */
export function deleteProject(id: string): boolean {
  const initialLength = projects.length;
  projects = projects.filter(p => p.id !== id);
  
  return projects.length < initialLength;
}

/**
 * Add tracks to a project
 */
export function addTracksToProject(projectId: string, trackData: Omit<Track, 'id'>[]): Track[] {
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  const newTracks: Track[] = trackData.map(data => ({
    id: uuidv4(),
    ...data
  }));
  
  project.tracks.push(...newTracks);
  project.updatedAt = new Date();
  
  return newTracks;
}

/**
 * Update a track in a project
 */
export function updateTrack(projectId: string, trackId: string, updates: Partial<Omit<Track, 'id'>>): Track | undefined {
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return undefined;
  }
  
  const track = project.tracks.find(t => t.id === trackId);
  
  if (!track) {
    return undefined;
  }
  
  Object.assign(track, updates);
  project.updatedAt = new Date();
  
  return track;
}

/**
 * Remove a track from a project
 */
export function removeTrack(projectId: string, trackId: string): boolean {
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    return false;
  }
  
  const initialLength = project.tracks.length;
  project.tracks = project.tracks.filter(t => t.id !== trackId);
  project.updatedAt = new Date();
  
  return project.tracks.length < initialLength;
}