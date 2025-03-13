// app/layout.tsx
import { ReactNode } from 'react';
import ClientProviders from './clientProviders';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-gray-900 to-black text-white">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
