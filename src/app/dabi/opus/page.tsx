'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MyProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Redirect if not logged in
        return;
      }

      setIsLoggedIn(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      if (error) console.error(error);
      else setProjects(data || []);
    };

    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">My Projects</h1>
      {isLoggedIn && projects.length === 0 ? (
        <p>No projects found. Start a new one!</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id} className="mb-4">
              <button
                onClick={() => router.push(`/dabi/${project.id}`)}
                className="bg-purple-500 px-4 py-2 rounded"
              >
                {project.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
