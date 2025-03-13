import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Project } from '@/types';
import { DawEditor } from '@/app/components/dabi/DawEditor';

export default function EditProjectPage() {
  const router = useRouter();
  const { project_id } = router.query;
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!project_id) return;

    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${project_id}`);
        const data = await res.json();
        setProject(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProject();
  }, [project_id]);

  // Example "save" function if you want to allow saving changes
  const handleSave = async (updatedProject: Project) => {
    try {
      await fetch(`/api/projects/${project_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
      // Possibly setProject(...) with new data
    } catch (err) {
      console.error(err);
    }
  };

  if (!project) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <DawEditor
      initialProject={project}
      onSave={handleSave}
      isNew={false}
    />
  );
}
