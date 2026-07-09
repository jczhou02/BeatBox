import React from 'react';
import { Track } from '@/types';
import { AudioWaveform } from './AudioWaveForm';

interface TrackItemProps {
  track: Track;
  currentTime: number;
  onSeek: (time: number) => void;
  onMute: (id: string) => void;
  onSolo: (id: string) => void;
  onVolume: (id: string, volume: number) => void;
  onPan: (id: string, pan: number) => void;
}

export const TrackItem: React.FC<TrackItemProps> = ({
  track,
  currentTime,
  onSeek,
  onMute,
  onSolo,
  onVolume,
  onPan
}) => {
  const handleSeek = (time: number) => {
    onSeek(time);
  };
  
  return (
    <div className="flex flex-col bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center px-3 py-2 bg-gray-900">
        <div className="flex-1">
          <div className="font-medium text-white truncate">{track.name}</div>
          {track.artist && (
            <div className="text-xs text-gray-400 truncate">{track.artist}</div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              track.isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => onMute(track.id)}
            title="Mute"
          >
            M
          </button>
          
          <button
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              track.isSoloed ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            onClick={() => onSolo(track.id)}
            title="Solo"
          >
            S
          </button>
        </div>
      </div>
      
      <div className="p-2">
        <AudioWaveform
          waveformData={track.waveformData}
          color={track.color || '#FF4081'}
          height={80}
          width={1000}
          currentTime={currentTime}
          duration={track.duration}
          onSeek={handleSeek}
        />
      </div>
      
      <div className="flex items-center px-3 py-2 bg-gray-900">
        <div className="flex items-center space-x-4 w-full">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="1"
              className="w-24"
              onChange={(e) => onVolume(track.id, parseFloat(e.target.value))}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Pan</span>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              defaultValue="0"
              className="w-24"
              onChange={(e) => onPan(track.id, parseFloat(e.target.value))}
            />
          </div>
          
          <div className="ml-auto text-xs text-gray-400">
            {track.bpm && <span>{track.bpm} BPM</span>}
            {track.key && <span className="ml-2">{track.key}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};