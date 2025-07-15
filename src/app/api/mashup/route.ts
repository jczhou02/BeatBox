import { NextResponse } from 'next/server';
// import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js'; // Use standard client for server-side
import { z } from 'zod';

// Environment variables validation (optional but good practice)
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  PYTHON_BACKEND_URL: z.string().url(),
  // Add SUPABASE_SERVICE_ROLE_KEY if you need admin actions here,
  // but prefer keeping admin actions in the dedicated backend (FastAPI)
});
const env = envSchema.parse(process.env);

interface Artist {
    name: string;
  }
  
// Initialize Supabase client for server-side route handlers
// Use anon key here; restrict sensitive operations via RLS or backend service role
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// --- Zod Schemas for Input Validation ---
const ArtistSchema = z.object({
  name: z.string(),
});

const IncomingTrackSchema = z.object({
  name: z.string(),
  artists: z.array(ArtistSchema).min(1),
  anchor: z.boolean().optional().default(false), // a user-explicitly chosen track
});

const RequestBodySchema = z.object({
  tracks: z.array(IncomingTrackSchema).min(1),
  mode: z.enum(["mashup", "mashup-plus"]),
  temperature: z.number().min(0).max(1).optional().default(0.1), // Optional
  numSuggestions: z.number().int().min(0).optional(),  // Optional
});


function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // Remove content in parentheses
    .replace(/\[.*?\]/g, ' ') // Remove content in brackets
    .replace(/\b(feat\.?|featuring|ft)\b/g, ' ft ') // Normalize features
    .replace(/[^\w\s']|_/g, ' ') // Remove punctuation except spaces and apostrophes
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

  interface HooktheorySection {
    id: string; // Section UUID
    source_track_id: string; // Source Track UUID
    status?: string;
    artist: string;
    title: string;
    section?: string;
    "chord progression"?: string;
    cp?: string | Record<string, any>; // Chord progression, can be string or object
    key?: string;
    scale?: string;
    bpm?: number; // Should be number in DB
    meter?: number;
    beatUnit?: number;
    danceability?: number;
    energy?: number;
    loudness?: number;
    acousticness?: number;
    instrumentalness?: number;
    liveness?: number;
    valence?: number;
    "duration (ms)"?: number; // Section duration
    genres?: string[]; // Assuming array
    "time signature"?: string;
    melody?: string  | Record<string, any>[];
    youtube_id?: string;
    "start timestamp (s)"?: number;
    "end timestamp (s)"?: number;
    cp_compare?: string;
  }
  
  // Type definition for track data being processed internally
  interface ProcessedTrackData {
    anchor: boolean;
    sections: HooktheorySection[];
  }
  
  // --- API Route Handler ---
  export async function POST(req: Request) {
    try {
      // 1. Validate Input
      const rawBody = await req.json();
      const validationResult = RequestBodySchema.safeParse(rawBody);
      if (!validationResult.success) {
        console.error("Invalid input:", validationResult.error.flatten());
        return NextResponse.json({ error: "Invalid input data", details: validationResult.error.flatten() }, { status: 400 });
      }
      const { tracks: incomingTracks, mode, temperature, numSuggestions } = validationResult.data;
  
      console.log("Received tracks:", incomingTracks);
  
      // 2. Fetch Initial Sections for User Tracks
      const trackDataPromises = incomingTracks.map(async (track): Promise<ProcessedTrackData | null> => {
        // const normalizedTitle = normalizeString(track.name);
        const normalizedTitle = normalizeString(track.name);
        // const normalizedArtists = track.artists.map(a => normalizeString(a.name));
        const normalizedArtists = track.artists.map(a => a.name.toLowerCase()); 
  
        console.log(`Querying for: Title="${normalizedTitle}", Artists="${normalizedArtists.join(', ')}"`);
  
        // Query hooktheory joining with source_tracks to filter efficiently
        // We need source_track_id, so select it directly or join. Let's query hooktheory directly
        // and filter artists in JS as before, but ensure we get source_track_id.
        // A more optimized query might involve full-text search or tsvector if performance degrades.
  
        const { data: matchingSections, error } = await supabase
          .from('hooktheory')
          .select('*') // Select all columns, including the vital source_track_id
          .ilike('title', `%${normalizedTitle}%`); // Initial broad match on title
  
        if (error) {
          console.error(`Supabase query error for "${normalizedTitle}": ${error.message}`);
          // Decide if one error fails the whole request or just skips the track
          return null; // Skip this track on error
        }
  
        if (!matchingSections || matchingSections.length === 0) {
          console.warn(`No title matches found for "${normalizedTitle}"`);
          return { anchor: track.anchor, sections: [] }; // Return empty if no title matches
        }
  
        // Filter by artist match (case-insensitive, partial match)
        const filteredSections = matchingSections.filter(section => {
          // The .some() method returns true if the callback is true for AT LEAST ONE element.
          // Example: ['david guetta', 'rihanna'].some(artist => 'rihanna'.includes(artist)) -> true
          return normalizedArtists.some(reqArtist => section.artist.includes(reqArtist));
      });
  
        if (filteredSections.length === 0) {
           console.warn(`No artist matches found for "${normalizedTitle}" / "${normalizedArtists.join(', ')}" after title match.`);
        } else {
           console.log(`Found ${filteredSections.length} sections for "${normalizedTitle}" / "${normalizedArtists.join(', ')}"`);
        }
  
  
        // Ensure the fetched data conforms to our expected type
        const correctlyTypedSections = filteredSections as HooktheorySection[];
        console.log(`Correctly typed sections for "${normalizedTitle}":`, correctlyTypedSections);
  
        return {
          anchor: track.anchor,
          sections: correctlyTypedSections,
        };
      });
  
      const initialTrackData = (await Promise.all(trackDataPromises))
                                 .filter((data): data is ProcessedTrackData => data !== null && data.sections.length > 0); // Keep only tracks with sections found
  
      if (initialTrackData.length === 0) {
          return NextResponse.json({ error: "No sections found for the provided tracks." }, { status: 404 });
      }
  
      let finalTracksToSend = initialTrackData;
        
  
      // 4. Prepare Data for FastAPI Backend
      // Group sections by source_track_id to potentially send less redundant data?
      // Or just send all sections and let backend handle it. Let's send all for now.
      const payloadForPython = finalTracksToSend.map(track => ({
        anchor: track.anchor,
        sections: track.sections.map(s => ({
          hooktheory_section_id: s.id, // Pass the unique section ID
          source_track_id: s.source_track_id, // Pass the crucial source track ID
          artist: s.artist,
          title: s.title,
          section_name: s.section || null,
          key: s.key || null,
          scale: s.scale || null,
          bpm: s.bpm ? Math.round(s.bpm) : null, // Ensure BPM is integer
          chord_progression: s["chord progression"] || s.cp || null,
          cp: s.cp || null,
          meter: s.meter || null,
          melody: s.melody || null,
          youtube_id: s.youtube_id || null, // Pass one known YT ID for potential download
          start_time_s: s["start timestamp (s)"] || 0,
          end_time_s: s["end timestamp (s)"] || null,
          section_duration_ms: s["duration (ms)"] || null,
          cp_compare: s.cp_compare || null,
          genres: s.genres || null,
          beatUnit: s.beatUnit || 1,
        })),
      }));
  
      if (payloadForPython.length === 0) {
          return NextResponse.json({ error: "No processable track sections found or generated." }, { status: 404 });
      }
  
      console.log(`Sending ${payloadForPython.length} track groups to Python backend...`);
      // console.log("Payload example:", JSON.stringify(payloadForPython[0], null, 2));
  
  
      // 5. Call FastAPI Backend
      const completePayload = {
        tracks: payloadForPython, // payloadForPython is already the array of tracks
        mode: mode, // Pass the mode from the original request
        numSuggestions: numSuggestions, // Pass this along too
        temperature: temperature // Or get this from request if you want
    };

    console.log("Sending complete payload to Python:", JSON.stringify(completePayload, null, 2));

    const pythonResponse = await fetch(
      `${env.PYTHON_BACKEND_URL}/api/process-tracks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completePayload), // Stringify the correct, complete object
      }
    );
  
      if (!pythonResponse.ok) {
        const errorBody = await pythonResponse.text();
        console.error(`Python backend error (${pythonResponse.status}): ${errorBody}`);
        throw new Error(`Python backend processing failed: ${pythonResponse.statusText} - ${errorBody}`);
      }
  
      const processedResponse = await pythonResponse.json();
  
      // 6. Process FastAPI Response (expecting timeline and signed URLs)
      // The FastAPI response should ideally be structured like:
      // { timeline: {...}, stem_urls: { "vocals": "signed_url_for_vocals", ... } }
      // Or if multiple results are possible: { results: [ {timeline: ..., stem_urls: ...}, ...] }
      // Assuming a single result for now:
      if (!processedResponse || !processedResponse.timeline || !processedResponse.stem_urls) {
           console.error("Invalid response format from Python backend:", processedResponse);
           throw new Error("Invalid response format from Python backend.");
      }
  
      console.log(
        'Received successful response from Python backend:',
        JSON.stringify(processedResponse, null, 2) // The magic is here!
      );
  
      // 7. Return Result to Frontend Client
      return NextResponse.json(processedResponse, { status: 200 });
  
    } catch (error) {
      console.error("Error in /api/mashup:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
    }
  }
  
  
  // --- Helper Function for Compatible Tracks ---
  
  // Define the structure expected by fetchCompatibleSections more clearly
  interface TrackWithSections {
      anchor: boolean;
      sections: HooktheorySection[];
  }
  
  async function fetchCompatibleSections(
      anchorTracks: TrackWithSections[],
      numSuggestions?: number
  ): Promise<ProcessedTrackData[]> {
      if (!anchorTracks || anchorTracks.length === 0) return [];
  
      const compatibleTrackSections: ProcessedTrackData[] = [];
      const BATCH_SIZE = 5; // Process anchor tracks in batches to avoid overly complex queries
  
      for (let i = 0; i < anchorTracks.length; i += BATCH_SIZE) {
          const batch = anchorTracks.slice(i, i + BATCH_SIZE);
          const promises = batch.map(async (track) => {
               // Use the first section of the anchor track as a reference point
              if (!track.sections || track.sections.length === 0) return [];
              const refSection = track.sections[0];
  
              const refKey = refSection.key;
              const refBpm = refSection.bpm;
              const refSourceTrackId = refSection.source_track_id; // Exclude self
  
              if (!refKey || !refBpm) {
                  console.warn(`Skipping compatibility check for "${refSection.title}" due to missing Key or BPM.`);
                  return [];
              }
  
              const bpmTolerance = 5; // Allow +/- 5 BPM
  
              // Query for compatible sections
              const { data, error } = await supabase
                  .from('hooktheory')
                  .select('*') // Fetch all data for potential use
                  .eq('key', refKey) // Match Key exactly (or use Camelot wheel logic)
                  .gte('BPM', refBpm - bpmTolerance) // BPM within range
                  .lte('BPM', refBpm + bpmTolerance)
                  .neq('source_track_id', refSourceTrackId) // Don't suggest the same track
                  //.limit(numSuggestions * 2); // Fetch more initially, group later
  
               if (error) {
                  console.error(`Supabase compatible query error for key ${refKey}, bpm ${refBpm}: ${error.message}`);
                  return [];
               }
               if (!data || data.length === 0) {
                   return [];
               }
  
              // Group results by source_track_id
              const groupedBySourceTrack = data.reduce((acc, section) => {
                  const id = section.source_track_id;
                  if (!acc[id]) {
                      acc[id] = [];
                  }
                  acc[id].push(section);
                  return acc;
              }, {} as Record<string, HooktheorySection[]>);
  
              // Convert grouped data back into ProcessedTrackData format
              const suggestions = Object.values(groupedBySourceTrack)
                  .slice(0, numSuggestions) // Limit to the number of *tracks* suggested
                  .map(sections => ({
                      anchor: false, // Suggested tracks are not anchors
                      sections: sections as HooktheorySection[],
                  }));
  
              return suggestions;
          });
  
          const batchResults = await Promise.all(promises);
          compatibleTrackSections.push(...batchResults.flat()); // Flatten the array of arrays
      }
  
      // Further deduplication if needed (e.g., ensure same source_track isn't suggested multiple times)
       const uniqueSuggestions = Array.from(new Map(
          compatibleTrackSections.map(track => [track.sections[0]?.source_track_id, track])
      ).values())
      .filter(track => track.sections[0]?.source_track_id); // Filter out any potential undefined IDs
  
  
      return uniqueSuggestions.slice(0, numSuggestions); // Ensure final count is correct
  }