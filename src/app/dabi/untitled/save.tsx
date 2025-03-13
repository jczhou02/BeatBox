'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewProject() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [projectData, setProjectData] = useState({ title: 'Untitled Remix', tracks: [] });

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setIsLoggedIn(!!data.user);
    };
    checkAuth();
  }, []);

  const handleSave = async () => {
    if (!isLoggedIn) {
      alert('Please log in to save your project!');
      return;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{ title: projectData.title, tracks: projectData.tracks }]);

    if (error) console.error('Save failed:', error);
    else router.push('/dabi/opus'); // Redirect to "My Projects"
  };

  return (
    <div className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">{projectData.title}</h1>
      {/* DAW Editor Goes Here */}
      <button onClick={handleSave} className="bg-green-500 px-4 py-2 rounded">
        Save Project
      </button>
    </div>
  );
}
