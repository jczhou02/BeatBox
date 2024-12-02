'use client';

import './battle.css';
import { useState, useEffect } from 'react';
import { startBattle, useSong, validateSong, endGame } from '@/app/utils/battle/battle'; // Utils functions
import SongCard from '@/app/components/battle/songCard'; // A reusable component for displaying song info
import Lobby from '@/app/components/battle/lobbyPage'; // A component for the battle lobby

export default function BattlePage() {
  const [currentSong, setCurrentSong] = useState(null); // The last valid song used
  const [songHistory, setSongHistory] = useState([]); // Songs used so far
  const [streak, setStreak] = useState(0); // Current streak
  const [error, setError] = useState(null); // Error messages (e.g., invalid song)
  const [timer, setTimer] = useState(30); // Countdown timer for each turn
  const [gameState, setGameState] = useState("lobby"); // Flag to indicate if the battle is active
  const [searchQuery, setSearchQuery] = useState(''); // User input for search
  const [searchResults, setSearchResults] = useState([]); // Search results from Spotify
  const [shake, setShake] = useState(false);


  useEffect(() => {
    // Timer logic for the battle
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      endGame(false);
    }
  }, [timer]);

  const startNewBattle = () => {
    startBattle();
    setStreak(0);
    setTimer(30);
    setGameState('inBattle');
  };

  const handleEndGame = (streak) => {
    // Update state and end the battle
    setStreak(streak);
    setGameState('battleOver');
    endGame();
  };

  
  const handleSearch = async (query) => {
    setSearchQuery(query);
  
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
  
    try {
      const response = await fetch(`/api/spotify/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.tracks?.items || []);
      } else {
        const error = await response.json();
        console.error('Search error:', error.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };
  

  const handleSelectSong = async (song) => {
    const isValid = validateSong(song, currentSong);
    if (isValid) {
      useSong(song);
      setCurrentSong(song);
      setSongHistory((prev) => [song, ...prev]);
      setStreak((prev) => prev + 1);
      setTimer(30);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setError('Invalid song selection.');
      triggerShake();
    }
  };
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500); // Reset the shake animation after 500ms
  };

  if (gameState === 'lobby') {
    return (
      <Lobby
        onStartBattle={startNewBattle} // Pass function to start battle
      />
    );
  }

  if (gameState === 'battleOver') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl">Battle Over</h1>
        <p>Your final streak: {streak}</p>
        <button
          onClick={() => setGameState('lobby')}
          className="mt-6 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  if (gameState === 'inBattle') {
    return (
      <div className="flex flex-col items-center overflow-y-scroll h-screen bg-dark-slate-gray">
        <h1 className="text-white text-2xl">Battle Mode</h1>
        <p className="text-white">Streak: {streak}</p>
        <p className="text-white">Time Left: {timer}s</p>

        {error && <p className="text-red-500 mb-2">{error}</p>}

      {/* Song Search */}
      <div className="song-input w-full mt-4">
        <input
          type="text"
          placeholder="Search for a song..."
          className={`w-3/4 p-2 rounded transition-transform ${
            shake ? 'animate-shake' : ''
          }`}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

        {/* Display Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results mt-4 w-3/4">
            {searchResults.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onSelect={() => handleSelectSong(song)}
              />
            ))}
          </div>
        )}

        {/* Song History */}
        <div className="song-history w-full mt-4">
          {songHistory.map((song, index) => (
            <SongCard key={index} song={song} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
