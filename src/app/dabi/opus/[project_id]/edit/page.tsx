// src/app/dabi/opus/[project_id]/edit/page.tsx
import { supabaseAdmin } from '@/lib/supabaseClient';
import EditProjectClient from './EditProjectClient'; 
import { UUID } from 'crypto';

export default async function EditProjectPage({
  params,
}: {
  params: { project_id: string };
}) {
  const projectId = params.project_id as UUID;
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    return (
      <div className="text-red-500 text-center p-8">
        {error.message}
      </div>
    );
  }

  return (
    <EditProjectClient initialProject={project} isNew={false} />
  );
}
