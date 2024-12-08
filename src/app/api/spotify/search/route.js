import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import redis from '@/app/lib/redis'; // Import your Redis client from lib/redis

const SPOTIFY_CACHE_TTL = 60 * 5; // 5 minutes

export async function GET(req) {
  // Extract query parameter from the request
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  if (!query || query.trim() === '') {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  // Retrieve the session
  const session = await auth();
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cacheKey = `spotify:search:${query}`;
  const cachedResults = await redis.get(cacheKey);

  if (cachedResults) {
    console.log('Cache hit for query:', query);
    return NextResponse.json(JSON.parse(cachedResults));
  }
  else {console.log('Cache miss for query:', query);}

  // If no cached data, fetch from Spotify
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=7`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Spotify API error:', error);
      return NextResponse.json({ error: error.message }, { status: response.status });
    }

    const data = await response.json();

    // Cache the results
    await redis.set(cacheKey, JSON.stringify(data), 'EX', SPOTIFY_CACHE_TTL);
    console.log(`Cache set for key: ${cacheKey}`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error querying Spotify API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
