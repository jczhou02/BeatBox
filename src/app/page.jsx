'use client';

import React, { useEffect, useState } from "react";
import Script from 'next/script';
import Layout from "./components/layout";
import { Header } from "./components/header";
import LoginForm from "../components/auth/LoginForm";
import { auth } from "../auth";

export default async function Home() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  

  useEffect(() => {
    // Ensure that the google object is available
    if (window.google) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_ID;

      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large" }
      );

      google.accounts.id.prompt(); // Automatically display the One Tap prompt
    }
  }, []);

  // This function handles the response from Google's API
  async function handleCredentialResponse(response) {
    // Prevent multiple clicks
    if (isSigningIn) return;
    setIsSigningIn(true);

    const token = response.credential;
    if (!token) {
      setIsSigningIn(false);
      return;
    }

    // Disable the button after the first click
    document.getElementById("google-signin-button").disabled = true;
  
    try {
      const res = await fetch('/api/account/google-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
  
      if (res.ok) {
        const data = await res.json();
        console.log(data.message);  // User authenticated successfully.
        // Provide feedback to the user, update the UI, or redirect as needed
      } else {
        console.error('Authentication failed:', await res.json());
        document.getElementById("google-signin-button").disabled = false;
        setIsSigningIn(false);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      document.getElementById("google-signin-button").disabled = false;
      setIsSigningIn(false);
    }
  }

  return (
    <Layout>
      <Header />
      {/* Load the Google Identity Services script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="beforeInteractive"
        onLoad={() => console.log('Google script loaded')}
      />
      <div className="flex justify-center items-center h-screen bg-dark-slate-gray">
        <div className="text-center">
          <img src="/beatboxlogofinal.svg" alt="BeatBox" width={180} height={37} />
          
          {/* Render the Google Sign-In Button
          <div id="google-signin-button"></div> */}
          <LoginForm />
          
          <pre>{/* Display user information here after login */}</pre>
        </div>
      </div>
    </Layout>
  );
}
