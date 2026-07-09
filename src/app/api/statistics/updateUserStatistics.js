import { supabase } from '@/lib/supabaseClient'; // Assuming Supabase client is initialized here

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { userId, stats } = JSON.parse(req.body);
    if (!userId || !stats) {
      return res.status(400).json({ error: 'Missing userId or stats' });
    }
    // Insert or update artist usage
    for (const [artist, usageCount] of Object.entries(stats.usageCounts)) {
      await supabase
        .from('artist_usage')
        .upsert(
          {
            player_id: userId,
            artist_name: artist,
            usage_count: usageCount,
            win_count: stats.winCounts[artist] || 0,
          },
          { onConflict: ['player_id', 'artist_name'] }
        );
    }
    // Update battles played, won, highest streak
    const { data, error } = await supabase
      .from('battle_stats')
      .upsert(
        {
          player_id: userId,
          battles_played: stats.battlesPlayed,
          battles_won: stats.battlesWon,
          highest_streak: stats.highestStreak,
        },
        { onConflict: ['player_id'] }
      );
    if (error) {
      throw error;
    }
    res.status(200).json({ message: 'Stats updated successfully.' });
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ error: 'Failed to update stats.' });
  }
}
