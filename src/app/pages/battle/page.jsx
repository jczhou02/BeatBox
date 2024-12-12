'use client';

import './battle.css';
import BattleOverCard from '@/app/components/battle/battleOverCard';
import debounce from 'lodash.debounce';
import Header from '@/components/layout/header';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { updateUsage, validateSong, endGame } from '@/app/utils/battle/battle'; // Utils functions
import SongCard from '@/app/components/battle/songCard'; // A reusable component for displaying song info
import Lobby from '@/app/components/battle/lobbyPage'; // A component for the battle lobby

export default function BattlePage() {
  const { data: session, status } = useSession();
  const [currentSong, setCurrentSong] = useState(null); // The last valid song used
  const [songHistory, setSongHistory] = useState([]); // Songs used so far
  const [streak, setStreak] = useState(0); // Current streak
  const [usedArtists, setUsedArtists] = useState({});
  const [usedGenres, setUsedGenres] = useState({});
  const [battleWon, setBattleWon] = useState(false); 
  const [error, setError] = useState(null); // Error messages (e.g., invalid song)
  const [timer, setTimer] = useState(0); // Countdown timer for each turn
  const [gameState, setGameState] = useState("lobby"); // Flag to indicate if the battle is active
  const [searchQuery, setSearchQuery] = useState(''); // User input for search
  const [searchResults, setSearchResults] = useState([]); // Search results from Spotify
  const [shake, setShake] = useState(false);
  const [firstSong, setFirstSong] = useState(true); // Flag to indicate the first song of the battle
  const [totalTime, setTotalTime] = useState(0); // Total time elapsed in the battle

  useEffect(() => {
    console.log('auth: ', status);
    console.log('session:', session);
  }, [status]);

  useEffect(() => {
    console.log('usedArtists:', usedArtists);
    //console.log('usedGenres:', usedGenres);
  }, [usedArtists]);

  useEffect(() => {
    console.log(gameState);
  }, [gameState]);

  useEffect(() => {
    // Timer logic for the battle
    if (timer > 0 && gameState === 'inBattle') {
      const interval = setInterval(() => {
        setTimer(timer - 1);
        setTotalTime((prev) => prev + 1); 
      }, 1000);
      return () => clearInterval(interval);
    } else if (gameState !== 'lobby') {
      setError('');  
      setSearchResults([]);    
      endGame(false, streak);
    }
    if (timer === 0 && gameState === 'inBattle') {
      console.log('songHistory:', songHistory);
    }
  }, [timer]);

  useEffect(() => {
    if (searchQuery === '') {
      setSearchResults([]);
    } else {
      debouncedSearch(searchQuery);
    }
    return () => debouncedSearch.cancel(); // Clean up debounce
  }, [searchQuery]);

  const startNewBattle = (playAgain=false) => {
    setTimer(30);
    setGameState('inBattle');
    if (playAgain) {
      setStreak(0);
      setSearchQuery('');
      setSongHistory([]);
      setUsedArtists({});
      setUsedGenres({});
      setTotalTime(0);
      setFirstSong(true);
    }
  };

  const handleQuit = (battleWon = battleWon, streak) => {
    // Update state and end the battle
    endGame();
  };

  
  const handleSearch = async (query) => {
    setSearchQuery(query);
  };

  const debouncedSearch = debounce(async (query) => {
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
  }, 105); // Adjust debounce delay as needed (300ms is standard)

    
  function useSong(song) {
    const artists = song.artists.map((artist) => artist.name);
    // Update artist usage
    let newUsedArtists = { ...usedArtists };
    artists.forEach((artist) => {
      newUsedArtists = updateUsage(newUsedArtists, artist);
    });
    // Update genre usage if applicable
    // let newUsedGenres = updateUsage(usedGenres, song.genre);
    setUsedArtists(newUsedArtists);
    // setUsedGenres(newUsedGenres);
    setStreak((prev) => prev + 1);
  }

  const handleSelectSong = async (song) => {
    console.log('Selected song:', song);
    const isValid = validateSong(song, currentSong, firstSong, usedArtists);
    if (isValid) {
      setError('');
      useSong(song);
      setCurrentSong(song);
      setSongHistory((prev) => [song, ...prev]);
      setTimer(30);
      setSearchQuery('');
      setSearchResults([]);
      setFirstSong(false);
    } else {
      setError('Invalid song selection.');
      triggerShake();
    }
  };

  const handleSaveBattle = async () => {
    try {
      const response = await fetch('/api/battle/saveBattle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songHistory: songHistory,
        }),
      });

      if (!response.ok) {
        console.error('Error saving battle:', await response.json());
      }
    } catch (error) {
      console.error('Save battle error:', error);
    }
  }


  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500); // Reset the shake animation after 500ms
  };

  const reset = (playAgain) => {
    if (playAgain) {
      startNewBattle(true);
    }
    else {
      setGameState('lobby');
  };
}

  if (gameState === 'lobby') {
    return (
      <div>
        <Header />
        <Lobby
          onStartBattle={startNewBattle} // Pass function to start battle
        />
      </div>
    );
  }


  if (gameState === 'inBattle') {
    return (
      <div className="flex flex-col items-center h-screen bg-dark-slate-gray">
        <div className="battle-header flex flex-row items-center justify-between bg-gray-800 p-4 rounded-lg shadow-lg w-3/4">
        {/* Left Section */}
          <div className="flex flex-col items-start">
            <div className="text-white text-lg font-semibold">{session?.user.name}</div>
            <div className="text-xl flex items-center">
              <span className="text-orange-500 text-2xl">🔥</span>
              <span className="ml-1 text-white">0</span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex flex-col items-center">
            <div
              className={`timer text-white text-lg font-bold px-4 py-2 rounded-full ${
                timer <= 10 ? 'bg-red-500' : 'bg-green-500'
              }`}
            >
              {timer}s
            </div>
            <div className="text-white mt-2">Streak: {streak}</div>
          </div>
        </div>
        {error && <div className="error-message text-red-500">{error}</div>}
        {timer === 0 ? (
          <BattleOverCard
            totalTime={totalTime}
            streak={streak}
            usedArtists={usedArtists.length}
            usedGenres={usedGenres.length}
            onSave={() => handleSaveBattle}
            onPlayAgain={() => reset(true)}
            onReturnToLobby={() => reset(false)}   
          />
        ) : (
          <div className="search-bar">
          <input
            type="text"
            placeholder="Search for a song..."
            className={`w-3/4 p-2 rounded transition-transform ${
              shake ? 'animate-shake' : ''
            }`}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button
            onClick={() => setSearchQuery('')}
          >
            X
          </button>
        </div>
        )}

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onSelect={() => handleSelectSong(song)}
              />
            ))}
          </div>
        )}

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