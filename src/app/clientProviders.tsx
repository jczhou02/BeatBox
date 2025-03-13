// src/app/clientProviders.tsx
'use client';

import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import store from './redux/store/store';
import Sidebar from '../components/layout/sidebar';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <Provider store={store}>
        {/* Full-screen flex container: sidebar on left, content on right */}
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />

          {/* Main content: grows to fill the rest of the space */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </Provider>
    </SessionProvider>
  );
}
