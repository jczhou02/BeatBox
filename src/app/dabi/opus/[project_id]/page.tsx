import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ProjectView({ params }: { params: { project_id: string } }) {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.project_id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        router.push('/dabi/opus'); // Redirect if not found
      } else {
        setProject(data);
      }
    };

    fetchProject();
  }, [params.project_id]);

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      {project ? (
        <>
          <h1 className="text-4xl font-bold mb-4">{project.title}</h1>
          <p>Project Details: {JSON.stringify(project, null, 2)}</p>
        </>
      ) : (
        <p>Loading project...</p>
      )}
    </div>
  );
}
