import { supabase } from './supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { streak } = req.body;

    // Example: Save battle session
    const { data, error } = await supabase.from('battle_sessions').insert([
      { player_id: req.user.id, streak, songs_chained: streak, won: streak > 10 },
    ]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Battle session saved' });
  }
}
