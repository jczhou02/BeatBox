import React from 'react';

interface AudioControlPanelProps {
  isPlaying: boolean;
  projectBpm: number;
  projectKey?: string;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onBpmChange: (bpm: number) => void;
  onSeek: (time: number) => void;
}

export const AudioControlPanel: React.FC<AudioControlPanelProps> = ({
  isPlaying,
  projectBpm,
  projectKey,
  currentTime,
  duration,
  onPlayPause,
  onBpmChange,
  onSeek
}) => {
  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };
  
  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBpmChange(parseInt(e.target.value, 10));
  };
  
  return (
    <div className="bg-gray-900 rounded-lg p-4 shadow-lg">
      <div className="flex items-center space-x-6">
        <button
          className="w-14 h-14 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center focus:outline-none"
          onClick={onPlayPause}
        >
          <span className="text-white text-xl">
            {isPlaying ? '⏸' : '▶'}
          </span>
        </button>
        
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">BPM</span>
          <input
            type="number"
            min="30"
            max="300"
            value={projectBpm}
            onChange={handleBpmChange}
            className="w-16 px-2 py-1 bg-gray-800 text-white rounded border border-gray-700"
          />
        </div>
        
        {projectKey && (
          <div className="px-3 py-1 bg-gray-800 rounded border border-gray-700">
            <span className="text-sm text-gray-300">{projectKey}</span>
          </div>
        )}
      </div>
    </div>
  );
};