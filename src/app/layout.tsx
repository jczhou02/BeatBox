// app/layout.tsx
import { ReactNode } from 'react';
import ClientProviders from './clientProviders';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-900">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
