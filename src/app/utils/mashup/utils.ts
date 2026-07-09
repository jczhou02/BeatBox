export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // Remove content in parentheses
    .replace(/\[.*?\]/g, ' ') // Remove content in brackets
    .replace(/\b(feat\.?|featuring|ft)\b/g, ' ft ') // Normalize features
    .replace(/[^\w\s']|_/g, ' ') // Remove punctuation except spaces and apostrophes
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

export interface HooktheorySection {
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
export interface ProcessedTrackData {
    anchor: boolean;
    sections: HooktheorySection[];
  }