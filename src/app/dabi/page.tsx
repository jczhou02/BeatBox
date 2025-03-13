import React from 'react';
import Link from 'next/link';
import { GetServerSideProps } from 'next';

export default function Daw() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold mb-8">Dabi</h1>
        <p className="text-xl mb-8">Daw X BeatBox. Own the night (or day!) with our beginner-friendly digital audio workstation. Whether your an seasoned DJ, edm enthusiast, or 2000s kid, Dabi is here to mashup, remix, and curated custom playlists tailored personally to any theme you desire.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/dabi/untitled">
            <div className="bg-pink-500 hover:bg-pink-600 p-8 rounded-lg text-center cursor-pointer transition">
              <h2 className="text-2xl font-bold mb-4">New Project</h2>
              <p>Start fresh with a new remix project</p>
            </div>
          </Link>
          
          <Link href="/dabi/opus">
            <div className="bg-purple-600 hover:bg-purple-700 p-8 rounded-lg text-center cursor-pointer transition">
              <h2 className="text-2xl font-bold mb-4">My Projects</h2>
              <p>Continue working on existing projects</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}