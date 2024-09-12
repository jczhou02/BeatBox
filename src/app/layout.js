import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import { SessionProvider } from "next-auth/react";

// Include the Inter font
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
