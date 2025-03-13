'use client';
import React from 'react';
import { Project } from '@/types';
import { DawEditor } from '@/app/components/dabi/DawEditor';

export default function UntitledProjectPage() {
  // Create a brand-new project in memory
  const newProject: Project = {
    id: 'temp-untitled', // a dummy ID
    name: 'Untitled Project',
    bpm: 120,
    tracks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // If user tries to "Save," you can prompt them to log in or do some local save
  const handleSave = (project: Project) => {
    // 1) Check if user is logged in
    // 2) If not, prompt login
    // 3) Once logged in, create a new project in Supabase
    console.log('Saving new project:', project);
  };

  return (
    <DawEditor
      initialProject={newProject}
      onSave={handleSave}
      isNew={true}
    />
  );
}
