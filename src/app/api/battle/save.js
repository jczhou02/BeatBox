// /pages/api/battle/save.js

import { supabase } from '@/app/utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, artistUsage, genreUsage, battleWon, streak } = req.body;

    try {
      // Update player stats
      await supabase
        .from('players')
        .update({
          battles_played: supabase.raw('battles_played + 1'),
          battles_won: battleWon ? supabase.raw('battles_won + 1') : undefined,
          highest_streak: supabase.raw(`GREATEST(highest_streak, ${streak})`),
        })
        .eq('id', userId);

      // Update artist usage
      for (const [artistId, count] of Object.entries(artistUsage)) {
        await supabase
          .from('artist_usage')
          .upsert({ player_id: userId, artist_id: artistId, usage_count: count }, { onConflict: ['player_id', 'artist_id'] });
      }

      // Update genre usage
      for (const [genre, count] of Object.entries(genreUsage)) {
        await supabase
          .from('genre_usage')
          .upsert({ player_id: userId, genre, usage_count: count }, { onConflict: ['player_id', 'genre'] });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving battle data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
