import { NextResponse } from 'next/server';
import { auth } from '@/auth'; 
import { supabaseAdmin } from '@/lib/supabaseClient'; 
import { Project } from '@/types';

// GET a single project
export async function GET(
  request: Request,
  { params }: { params: { project_id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', params.project_id)
    .eq('user_id', session.user.id) // Security: ensure user owns the project
    .single();

  if (error || !data) {
    return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH (update) a project
export async function PATCH(
  request: Request,
  { params }: { params: { project_id: string } }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const updates: Partial<Project> = await request.json();
  delete updates.id;
  delete updates.user_id;

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.project_id)
    .eq('user_id', session.user.id) // Security check
    .select()
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update project', details: error.message }), { status: 500 });
  }

  return NextResponse.json(data);
}