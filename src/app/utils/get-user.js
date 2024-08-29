'use client';

import { useEffect, useState } from "react";

export const getUser = () => {
  const [user, setUser] = useState(undefined);
  const isLoading = user === undefined;

  useEffect(() => {
    const handleCredentialResponse = (response) => {
      if (response.credential) {
        // Here you can decode the credential to get user information or pass it to your server
        setUser(response); // Simplified example; handle this based on your app's needs
      } else {
        setUser(null);
      }
    };

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_ID,
      callback: handleCredentialResponse,
    });

    window.google.accounts.id.prompt(); // Shows the one-tap sign-in prompt

    // Cleanup
    return () => {
      setUser(null);
    };
  }, []);

  return { user, isLoading };
};
