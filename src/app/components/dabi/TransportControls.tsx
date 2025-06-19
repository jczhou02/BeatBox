import React from 'react';
import { FaSoundcloud } from 'react-icons/fa';

const formatTime = (timeInSeconds: number): string => {
  const totalSeconds = Math.floor(timeInSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface TransportControlsProps {
  isPlaying: boolean;
  isLoaded: boolean; // To know when audio is ready for playback
  currentTime: number;
  totalDuration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  // bpm props are kept for future use or if you want to display it
  bpm?: number; 
  onBpmChange?: (bpm: number) => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  isPlaying,
  isLoaded,
  currentTime,
  totalDuration,
  onPlayPause,
  onSeek,
  bpm,
}) => {

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isLoaded || totalDuration === 0) return;

    const progressBar = event.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left; // Get click position relative to the bar
    const width = rect.width;
    const seekRatio = clickX / width;
    
    onSeek(seekRatio * totalDuration);
  };
  
  // Calculate progress percentage, ensuring no division by zero
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center space-x-4 px-2 py-3 bg-gray-900/50 rounded-lg">
      {/* Play/Pause Button */}
      <button 
        className={`w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-lg transition-all
                    ${!isLoaded ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-600'}`}
        onClick={onPlayPause}
        disabled={!isLoaded}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        <span>
          {isLoaded ? (isPlaying ? '⏸' : '▶') : '...'}
        </span>
      </button>      
      
      {/* Current Time Display */}
      <span className="text-sm font-mono text-gray-400 w-12 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Interactive Progress Bar */}
      <div 
        className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer group"
        onClick={handleSeek}
      >
        <div 
          className="h-full bg-pink-500 rounded-full relative"
          style={{ width: `${progressPercent}%` }}
        >
            {/* Draggable handle that appears on hover */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full -mr-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>
      
      {/* Total Duration Display */}
      <span className="text-sm font-mono text-gray-400 w-12 text-left">
        {formatTime(totalDuration)}
      </span>

      {/* BPM Display (kept as is) */}
      {bpm && (
        <div className="flex items-center space-x-2">
            <div className="bg-gray-800 px-4 py-2 rounded-md">
            <span className="text-white font-medium">{Math.round(bpm)} bpm</span>
            </div>
        </div>
      )}
      
      {/* <button className="bg-gray-800 px-4 py-2 rounded">
        <span className="text-white text-sm">Export</span>
      </button>
      
      <button className="bg-gray-800 px-4 py-2 rounded">
        <span className="text-white text-sm">Download</span>
      </button>
      
      <button className="bg-orange-600 px-3 py-2 rounded flex">
        <FaSoundcloud /><span className="text-white text-sm"> Share to SoundCloud</span>
      </button> */}
    </div>
  );
};
