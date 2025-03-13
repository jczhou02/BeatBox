let sessionStats = {
    usageCounts: {},
    winCounts: {},
    battlesPlayed: 0,
    battlesWon: 0,
    highestStreak: 0,
    partyStarters: {},
  };
  
  // Update stats after each battle
  export function updateStatsAfterBattle(battleData) {
    sessionStats.battlesPlayed += 1;
    sessionStats.highestStreak = Math.max(sessionStats.highestStreak, battleData.streak);
    // Update usage & win counts
    battleData.artistsUsed.forEach((artist) => {
      sessionStats.usageCounts[artist] = (sessionStats.usageCounts[artist] || 0) + 1;
    });
    if (battleData.won) {
      sessionStats.battlesWon += 1;
      battleData.artistsUsed.forEach((artist) => {
        sessionStats.winCounts[artist] = (sessionStats.winCounts[artist] || 0) + 1;
      });
    }
    // Party starter
    const starterArtist = battleData.partyStarter;
    if (starterArtist) {
      sessionStats.partyStarters[starterArtist] = (sessionStats.partyStarters[starterArtist] || 0) + 1;
    }
  }

  // Persist stats to the backend
  export async function persistStatsToDatabase(userId) {
    try {
      const response = await fetch('/api/stats/update', {
        method: 'POST',
        body: JSON.stringify({ userId, stats: sessionStats }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        console.error('Failed to update stats:', await response.json());
      } else {
        console.log('Stats updated successfully.');
        sessionStats = {}; // Clear session stats after syncing
      }
    } catch (error) {
      console.error('Error persisting stats:', error);
    }
  }

  export function getSessionStats() {
    return sessionStats;
  }
  