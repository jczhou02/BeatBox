const fetchUserStats = async (playerId) => {
    const topArtists = await db.query(`
      SELECT artist_name, usage_count, win_count
      FROM artist_usage
      WHERE player_id = $1
      ORDER BY usage_count DESC
      LIMIT 1
    `, [playerId]);
  
    const topGenres = await db.query(`
      SELECT genre, usage_count, win_count
      FROM genre_usage
      WHERE player_id = $1
      ORDER BY usage_count DESC
      LIMIT 1
    `, [playerId]);
  
    return { topArtists, topGenres };
  };
  