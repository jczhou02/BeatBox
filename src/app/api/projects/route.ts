import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Fetch all projects for the logged-in user
export async function GET(req: Request) {
  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user_id);

  return error
    ? NextResponse.json({ error }, { status: 500 })
    : NextResponse.json({ projects: data });
}

// Save a new project
export async function POST(req: Request) {
  const { user_id, title, tracks } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });

  const { data, error } = await supabase
    .from('projects')
    .insert([{ user_id, title, tracks }]);

  return error
    ? NextResponse.json({ error }, { status: 500 })
    : NextResponse.json({ message: 'Project saved successfully', project: data });
}
