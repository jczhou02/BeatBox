import React from 'react';
import { Track } from '@/types';
import { WaveformDisplay } from './WaveFormDisplay';
import { TrackControls } from './TrackControls';

interface TrackListProps {
  tracks: Track[];
  currentTime: number;
  onSeek: (time: number) => void;
  onMute: (id: string) => void;
  onSolo: (id: string) => void;
  onVolumeChange: (id: string, volume: number) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  currentTime,
  onSeek,
  onMute,
  onSolo,
  onVolumeChange
}) => {
  return (
    <div className="space-y-4">
      {tracks.map(track => (
        <div key={track.id} className="flex items-center space-x-4 bg-gray-800 p-2 rounded">
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{track.name}</div>
            <div className="text-xs text-gray-400">{track.artist || 'Unknown'}</div>
            <WaveformDisplay
              track={track}
              currentTime={currentTime}
              color={track.color || '#ff4081'}
              height={80}
              onClick={onSeek}
            />
          </div>
          <TrackControls
            track={track}
            onMute={onMute}
            onSolo={onSolo}
            onVolumeChange={onVolumeChange}
          />
        </div>
      ))}
    </div>
  );
};
