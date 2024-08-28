'use client';

import React from "react";
import Layout from "./components/layout";
import { getUser } from "./utils/get-user";
import { Header } from "./components/header";

export default function Home() {
  const { user, isLoading } = getUser();

  const handleLogin = () => {
    // Construct the Google OAuth authentication URL
    const authUrl = "https://accounts.google.com/o/oauth2/auth?" +
      "client_id="+ process.env.NEXT_PUBLIC_GOOGLE_ID +  // Replace with your Google OAuth client ID
      "&redirect_uri=http://localhost:3000/api/account/google/callback"
      "&response_type=code" +
      "&scope=email%20profile" +
      "&access_type=offline";

    // Redirect the user to the Google OAuth authentication URL
    window.location.href = authUrl;
  };

  return (
    <Layout>
      <Header/>
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <img src="/beatboxlogofinal.svg" alt="BeatBox" width={180} height={37} />
          <h2>Welcome to BeatBox! 🎵</h2>
          {user ? (
            <button onClick={user?.signOut} className="btn">
              Logout
            </button>
          ) : (
            <button onClick={handleLogin} className="btn">
              Login
            </button>
              )}
          <pre>{JSON.stringify(user, null, 2)}</pre>
          {user && <img src={user.imageUrl} />}
        </div>
      </div>
    </Layout>
  );
}
