import React from "react";
import ToggleDarkMode from "./darkmodetoggle";

export const Header = () => {
  return (
    <div className="border-b-4 border-black flex justify-around">
      <div>Welcome to BeatBox bitch 🎵</div>
      <ToggleDarkMode />
    </div>
  );  
};
