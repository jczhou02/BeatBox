'use client';
import React, { useState } from 'react';
import { DawEditor } from '@/app/components/dabi/DawEditor';
import { Project } from '@/types';
import { toast } from 'react-hot-toast';

export default function EditProjectClient({
  initialProject,
  isNew,
}: {
  initialProject: Project;
  isNew: boolean;
}) {
  const [project, setProject] = useState(initialProject);

  const handleSave = async (updated: Project): Promise<Project> => {
    const res = await fetch(`/api/projects/${updated.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Failed to update project');
    const saved = await res.json();
    toast.success('Project updated!');
    setProject(saved);
    return saved;
  };

  return (
    <DawEditor
      initialProject={project}
      onSave={handleSave}
      isNew={isNew}
    />
  );
}
