'use client';
import React from 'react';
import { useRouter } from 'next/navigation'; 
import { Project } from '@/types';
import { DawEditor } from '@/app/components/dabi/DawEditor';
import { toast } from 'react-hot-toast'; 
import { Toaster } from 'react-hot-toast';

export default function UntitledProjectPage() {
  const router = useRouter();

  // Create a brand-new project in memory, matching the updated interface
  const newProject: Project = {
    id: 'temp-untitled',
    name: 'Untitled Project',
    bpm: 120,
    tracks: [],
    mashupData: null, // Initialize mashupData as null
    createdAt: new Date(),
    updatedAt: new Date(),
    user_id: '', // This will be set when the user saves the project
    description: '', // Initialize description as empty string
    key: null, // Initialize key as null
  };

const handleSave = async (projectToSave: Project) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectToSave.name,
          bpm: projectToSave.bpm,
          mashupData: projectToSave.mashupData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const createdProject: Project = await response.json();
      toast.success('Project saved!');
      
      // This redirect is the final step of a successful save.
      router.push(`/dabi/opus/${createdProject.id}/edit`);

    } catch (err: any) {
      console.error(err);
      toast.error(`Could not save project: ${err.message}`);
      // Re-throw to let the caller (DawEditor) know it failed.
      throw err;
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <DawEditor
        initialProject={newProject}
        onSave={handleSave}
        isNew={true}
      />
    </>
  );
}