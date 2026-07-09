import { NextResponse, NextRequest} from 'next/server';
import redis from '@/lib/redis'; // Import your Redis client from lib/redis

const SPOTIFY_CACHE_TTL = 3600 * 24 // 1 day
const SPOTIFY_TOKEN_CACHE_TTL = 3600; // 1 hour (Spotify token lifespan)

async function getSpotifyAccessToken() {
  // Check Redis for an existing token
  const cachedToken = await redis.get("spotify:public_access_token");
  if (cachedToken) {
    console.log("Using cached Spotify token.");
    return cachedToken;
  }

  console.log("Fetching new Spotify token...");

  const authHeader = `Basic ${Buffer.from(
    `${process.env.AUTH_SPOTIFY_ID}:${process.env.AUTH_SPOTIFY_SECRET}`
  ).toString("base64")}`;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: authHeader,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      console.error("Spotify Token Fetch Error:", await response.json());
      throw new Error("Failed to get Spotify access token.");
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // Cache the token in Redis for 1 hour
    await redis.set("spotify:public_access_token", accessToken, "EX", SPOTIFY_TOKEN_CACHE_TTL);

    return accessToken;
  } catch (error) {
    console.error("Error fetching Spotify access token:", error);
    return null;
  }
}


export async function GET(req: NextRequest) {
  // Extract query parameter from the request
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  if (!query || query.trim() === '') {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  // Retrieve the session
  // const session = await auth();
  // if (!session || !session.accessToken) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  const cacheKey = `spotify:search:${query}`;
  const cachedResults = await redis.get(cacheKey);

  if (cachedResults) {
    console.log('Cache hit for query:', query);
    return NextResponse.json(JSON.parse(cachedResults));
  }
  else {console.log('Cache miss for query:', query);}

  // If no cached data, fetch from Spotify
  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Spotify Authentication Failed" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=7`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, 
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

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: 'POST request received' });
}
