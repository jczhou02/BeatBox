let usedArtists = {}; 
let usedGenres = {}
let streak = 0;       // Player's current streak ; good for singlePlayer
let battleWon = false;         
let session = {};

function startBattle() {
  // Reset game state
  usedArtists = {};
  usedGenres = {};
  streak = 0;
  battleWon = false;
}

function updateArtistUsage(artistId) {
    usedArtists[artistId] = (usedArtists[artistId] || 0) + 1;
  }

function updateGenreUsage(genre) { 
    genreUsage[genre] = (genreUsage[genre] || 0) + 1;
    }
  
function useSong(song) {
  const artists = song.artists.map(artist => artist.id);

  // genre = ...   use outside api to convert song title to genre
  artists.forEach(artist => updateArtistUsage(artist));
  //updateGenreUsage(genre);

  streak++;
  startTimer();
}

function validateSong(newSong, currentSong) {
  const currentArtists = currentSong?.artists.map((artist) => artist.id) || [];
  const newArtists = newSong.artists.map(artist => artist.id);

  // Check artist overlap and usage limit
  const validArtist = newArtists.some(artist => currentArtists.includes(artist) && (usedArtists[artist] || 0) < 3);
  if (!validArtist) {
    return false;
  }

  return true;
}


function endGame(battleWon) {
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
          streak,
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
    startBattle,
    validateSong,
    useSong,
    endGame,
  };