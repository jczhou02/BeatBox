// src/app/components/dabi/TrackLane.tsx
import React, { useState, memo } from 'react';
import { MashupTrackData } from '@/types';

interface TrackLaneProps {
  trackData: MashupTrackData;
  totalDuration: number;
  onMute: (stemPath: string, isMuted: boolean) => void;
  onSolo: (stemPath: string, isSoloed: boolean) => void;
  onUpdateTrackProperty: (stemPath: string, property: 'volume' | 'pan', value: number) => void;
  currentTime: number; 
}

// Using React.memo to prevent re-renders if props haven't changed.
export const TrackLane: React.FC<TrackLaneProps> = memo(({
  trackData,
  totalDuration,
  onMute,
  onSolo,
  onUpdateTrackProperty,
  currentTime
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSoloed, setIsSoloed] = useState(false);
  const stemName = trackData.stem_path.split('/').pop()?.split('.')[0] || 'Unknown Track';

  const handleMuteToggle = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (isSoloed) { // Unsolo if you mute a soloed track
        handleSoloToggle();
    }
    onMute(trackData.stem_path, newMuteState);
  };
  
  const handleSoloToggle = () => {
    const newSoloState = !isSoloed;
    setIsSoloed(newSoloState);
    if (newSoloState && isMuted) { // Unmute if you solo a muted track
        handleMuteToggle();
    }
    onSolo(trackData.stem_path, newSoloState);
  };

  return (
    <div className="flex items-center space-x-4 p-2 bg-gray-800/50 rounded-lg">
      {/* Track Controls */}
      <div className="w-48 flex-shrink-0 space-y-2 p-2 bg-gray-900/30 rounded-md">
        <h4 className="font-bold text-white truncate capitalize">{stemName.replace(/_/g, ' ')}</h4>
        <div className="flex items-center space-x-2">
          <button onClick={handleMuteToggle} className={`w-8 h-8 text-sm font-bold rounded ${isMuted ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'}`}>M</button>
          <button onClick={handleSoloToggle} className={`w-8 h-8 text-sm font-bold rounded ${isSoloed ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}`}>S</button>
        </div>
        <div>
            <label className="text-xs text-gray-400">Volume</label>
            <input 
                type="range" min="0" max="1.5" step="0.01" defaultValue="1"
                onChange={(e) => onUpdateTrackProperty(trackData.stem_path, 'volume', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb:bg-indigo-500"
            />
        </div>
        <div>
            <label className="text-xs text-gray-400">Pan</label>
            <input 
                type="range" min="-1" max="1" step="0.01" defaultValue="0"
                onChange={(e) => onUpdateTrackProperty(trackData.stem_path, 'pan', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>
      </div>

      {/* Clip Timeline */}
      <div className="relative flex-grow h-24 bg-gray-900/70 rounded overflow-hidden">
        {/* Render Clips */}
        {totalDuration > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${(currentTime / totalDuration) * 100}%`}}
          />
        )}
        {trackData.clips.map(clip => {
            const left = (clip.project_start_time / totalDuration) * 100;
            // Adjust width for playback rate
            const effectiveDuration = clip.source_duration / clip.playback_rate;
            const width = (effectiveDuration / totalDuration) * 100;
            
            return (
                <div
                    key={clip.id}
                    className="absolute h-full bg-indigo-500/60 border-l-2 border-indigo-300 rounded-sm flex items-center justify-start overflow-hidden"
                    style={{ left: `${left}%`, width: `${width}%`}}
                    title={`Clip: ${clip.id}\nStarts: ${clip.project_start_time.toFixed(2)}s\nDuration: ${effectiveDuration.toFixed(2)}s\nRate: ${clip.playback_rate.toFixed(2)}x`}
                >
                    <div className="text-white text-xs p-1 truncate pointer-events-none">{clip.id}</div>
                </div>
            )
        })}
      </div>
    </div>
  );
});
TrackLane.displayName = 'TrackLane';