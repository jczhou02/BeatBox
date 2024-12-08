// app/ClientProviders.tsx
'use client';

import { Provider } from 'react-redux';
import { SessionProvider } from 'next-auth/react';
import store from './redux/store/store';
import Sidebar from '../components/layout/sidebar';
import Header from '../components/layout/header';
import { ReactNode } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <Provider store={store}>
        <div className="flex h-screen">
          <Sidebar>
            {children}
          </Sidebar>
        </div>
      </Provider>
    </SessionProvider>
  );
}
