import React from 'react';
import { FaSoundcloud } from 'react-icons/fa';

interface TransportControlsProps {
  isPlaying: boolean;
  bpm: number;
  onPlayPause: () => void;
  onBpmChange: (bpm: number) => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying,
  bpm,
  onPlayPause,
  onBpmChange
}) => {
  return (
    <div className="flex items-center space-x-4 bg-gray-900 p-4 rounded">
      <button 
        className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center"
        onClick={onPlayPause}
      >
        <span className="text-white">
          {isPlaying ? '⏸' : '▶'}
        </span>
      </button>
      
      <div className="flex items-center space-x-2">
        <span className="text-white text-sm">BPM</span>
        <div className="bg-gray-800 px-4 py-2 rounded">
          <span className="text-white font-medium">{bpm}</span>
        </div>
      </div>
      
      <div className="flex-1 h-1 bg-gray-700 rounded">
        {/* Timeline/progress bar */}
      </div>
      
      <button className="bg-gray-800 px-4 py-2 rounded">
        <span className="text-white text-sm">Export</span>
      </button>
      
      <button className="bg-gray-800 px-4 py-2 rounded">
        <span className="text-white text-sm">Download</span>
      </button>
      
      <button className="bg-orange-600 px-3 py-2 rounded flex">
        <FaSoundcloud /><span className="text-white text-sm"> Share to SoundCloud</span>
      </button>
    </div>
  );
};
