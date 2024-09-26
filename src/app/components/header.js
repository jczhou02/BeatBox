'use client';
import React from "react";
import { useSession } from "next-auth/react";
import ToggleDarkMode from "./darkmodetoggle";
import Logout from "../../components/auth/Logout"; // Assuming Logout component is in the same directory

export const Header = () => {
  const { data: session } = useSession();

  return (
    <div className="border-b-4 border-black flex justify-between items-center px-4">
        <div className="text-lg">
          {session
            ? `Welcome to BeatBox ${session.user.name}! Prepare for battle 😈🎵`
            : "Welcome to BeatBox! Please sign into your Spotify account and prepare for battle 🎵"}
        </div>
      <div className="ml-auto flex items-center space-x-4">
        <ToggleDarkMode />
        {session && <Logout />} {/* Conditionally render the logout button */}
      </div>
    </div>
  );
};
