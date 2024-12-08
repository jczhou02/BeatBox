function updateUsage(usage, key) {
  return {
    ...usage,
    [key]: (usage[key] || 0) + 1,
  };
}

function validateSong(newSong, currentSong, firstSong, usedArtists) {
  // first, if newSong has only one artist then return false
  if (newSong.artists.length < 2) {
    return false;
  }
  if (firstSong) {
    return true;
  }
  const currentArtists = currentSong?.artists.map((artist) => artist.id) || [];
  const newArtists = newSong.artists.map(artist => artist.id);

  // Check artist overlap and usage limit
  const validArtist = newArtists.some(artist => currentArtists.includes(artist) && (usedArtists[artist] || 0) < 3);  
  if (!validArtist) {
    return false;
  }

  return true;
}


function endGame(battleWon, streak) {
  console.log(`Game Over! Final Streak: ${streak}`);
  //saveBattle(battleWon);
}

const saveBattle = async (battleWon) => {
    try {
      const response = await fetch('/api/battle/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          artistUsage: usedArtists,
          genreUsage: usedGenres,
          battleWon: battleWon,
          streak: streak,
        }),
      });
  
      if (!response.ok) {
        console.error('Error saving battle:', await response.json());
      }
    } catch (error) {
      console.error('Save battle error:', error);
    }
  };
  

  export {
    updateUsage,
    validateSong,
    endGame,
  };