export interface Track {
    id: string;
    name: string;
    artist?: string;
    source: 'upload' | 'spotify';
    fileUrl: string;
    waveformData: number[];
    bpm: number;
    key?: string;
    duration: number;
    color?: string;
    isMuted: boolean;
    isSoloed: boolean;
  }
  
  export interface Project {
    id: string;
    name: string;
    bpm: number;
    key?: string;
    tracks: Track[];
    createdAt: Date;
    updatedAt: Date;
  }
  