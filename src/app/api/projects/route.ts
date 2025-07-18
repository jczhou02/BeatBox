// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { Project } from '@/types';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'user_id'> = await request.json();

  const {data, error} = await supabaseAdmin
    .from('projects')
    .insert({
      ...projectData,
      user_id: session?.user?.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}