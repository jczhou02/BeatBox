// beatbox/src/app/statistics/page.tsx
'use client';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Make sure supabaseClient.js is properly set up
import SignInButton from '@/components/auth/signIn';

export default function Statistics() {
  const { data: session, status } = useSession();
  const [statistics, setStatistics] = useState(null);

  if (status === 'loading') {
    return <p>Loading...</p>;
  }

  useEffect(() => {
    if (session) {
      console.log(session.user.id);
      fetchStatistics();
    }
  }, [session]);

  const fetchStatistics = async () => {
    const { data, error } = await supabase
      .from('beatboxers') // Adjust this table name based on your Supabase schema
      .select('*')
      .eq('id', session.user.id);

    if (error) {
      console.error('Error fetching statistics:', error);
    } else {
      setStatistics(data);
    }
  };

  return (
  <div>
    <Header />
    <div className="p-8 text-center">
      <h1>Your Music Battle Stats</h1>
      {session ? (
        statistics ? (
        <div className="mt-6">
          <p><strong>Top Genre:</strong> {statistics[0].top_genre}</p>
          <p><strong>Party Starter:</strong> {statistics[0].party_starter}</p>
          <p><strong>Battles:</strong> {statistics[0].matches_played}</p>
          <p><strong>Wins:</strong> {statistics[0].battles_won}</p>
        </div>
      ) : (
        <p>Loading your statistics...</p>
      )
      ) : (
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-4">You need to sign in to access this page.</h1>
          <SignInButton />
        </div>
      )}
    </div>
  </div>
  );
}
