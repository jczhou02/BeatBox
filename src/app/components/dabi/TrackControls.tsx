import React from 'react';
import { Track } from '@/types';

interface TrackControlsProps {
  track: Track;
  onMute: (id: string) => void;
  onSolo: (id: string) => void;
  onVolumeChange: (id: string, volume: number) => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  track,
  onMute,
  onSolo,
  onVolumeChange
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <button 
          className={`w-6 h-6 text-xs font-bold ${track.isSoloed ? 'bg-yellow-500' : 'bg-gray-700'}`}
          onClick={() => onSolo(track.id)}
        >
          S
        </button>
        <button 
          className={`w-6 h-6 text-xs font-bold ${track.isMuted ? 'bg-red-500' : 'bg-gray-700'}`}
          onClick={() => onMute(track.id)}
        >
          M
        </button>
      </div>
      <div className="flex flex-col">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue="1"
          onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
          className="w-24"
        />
      </div>
    </div>
  );
};
