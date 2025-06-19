export interface BaseTrack {
  id: string;
  name: string;
  duration?: number;
  color?: string;
  isMuted: boolean;
  isSoloed: boolean;
  anchor: boolean;
  waveformData?: number[];
  bpm?: number;
  key?: string;
}

export interface SpotifyTrack extends BaseTrack {
  source: 'spotify';
  artists: Array<{ name: string }>;
  album?: { images?: Array<{ url: string }> };
  uri: string;
}

  export interface SpotifyPlaylist {
    id: string;
    name: string;
    tracks: {
      items: {
        track: SpotifyTrack;
      }[];
    };
    preview_url?: string;
  }

export interface UploadedTrack extends BaseTrack {
  source: 'upload';
  fileUrl: string;
}

export type Track = SpotifyTrack | UploadedTrack;

  
  export interface Project {
    id: string;
    name: string;
    bpm: number;
    key?: string;
    tracks: Track[];
    createdAt: Date;
    updatedAt: Date;
  }
  

  export interface MashupClip {
  id: string;
  project_start_time: number;
  source_start_time: number;
  source_duration: number;
  playback_rate: number;
  gain: number;
  pan: number; // We'll manage pan at the track level for simplicity first
}

export interface MashupTrackData {
  stem_path: string; // e.g., "stems/guid/vocals.mp3"
  clips: MashupClip[];
}

export interface MashupTimeline {
  tracks: MashupTrackData[];
}

export interface MashupResponse {
  timeline: MashupTimeline;
  stem_urls: Record<string, string>; // e.g., { "vocals": "https://...", "no_vocals": "..." }
}

// NEW: A type to represent the processed track state in the audio engine
export interface AudioEngineTrack {
  id: string; // e.g., "vocals"
  name: string; // e.g., "vocals"
  clips: MashupClip[];
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
}

export interface MashupClip {
  id: string;
  project_start_time: number;
  source_start_time: number;
  source_duration: number;
  playback_rate: number;
  gain: number;
  pan: number;
}

export interface MashupTrackData {
  stem_path: string;
  clips: MashupClip[];
}

export interface MashupTimeline {
  tracks: MashupTrackData[];
}

// This is the complete response object from your API
export interface MashupResponse {
  timeline: MashupTimeline;
  stem_urls: Record<string, string>;
}

// This alias is useful for passing the data around, used by the hook and components
export type MashupData = MashupResponse;