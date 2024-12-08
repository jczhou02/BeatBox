// beatbox/src/app/page.tsx (LandingPage)
'use client';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import {scope} from '@/app/utils/scope';
import Header from '../components/layout/header';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to /home if the session is authenticated
    console.log("status: ", status);
    console.log("session: ", session);
    if (status === 'authenticated') {
      router.push('/home');
    }
  }, [status, router]);

  return (
  <div>
    <Header/>
    <div className="flex flex-col justify-center items-center h-screen w-full bg-dark-slate-gray">
      <div className="text-center">
        <img src="/beatboxlogofinal.svg" alt="BeatBox" width={200} height={37} />
        <Suspense fallback={<p className="text-white">Loading...</p>} >
        <h1 className="text-white mt-4">Welcome to BeatBox!</h1>
        <p className="text-white">Sign in with Spotify and start exploring your music stats!</p>
        <button
          onClick={() => {signIn('spotify',{
            scope: scope,
            response_type: 'code',
          }).catch((err) => console.error('SignIn Error:', err));
        }}
          className="mt-6 bg-green-500 text-white px-4 py-2 rounded"
        >
          Sign in with Spotify
        </button>
        </Suspense>
      </div>
    </div>
  </div>
  );
}
