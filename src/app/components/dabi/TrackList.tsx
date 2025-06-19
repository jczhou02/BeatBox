// src/app/components/dabi/TrackList.tsx
import React from 'react';
import { TrackLane } from './TrackLane';
import { MashupData } from '@/types'; // Import main type

interface TrackListProps {
  mashupData: MashupData;
  currentTime: number;
  totalDuration: number;
  onMute: (stemPath: string, isMuted: boolean) => void;
  onSolo: (stemPath: string, isSoloed: boolean) => void;
  onUpdateTrackProperty: (stemPath: string, property: 'volume' | 'pan', value: number) => void;
  // onSeek is not needed here, handled by transport
}

export const TrackList: React.FC<TrackListProps> = ({
  mashupData,
  currentTime,
  totalDuration,
  onMute,
  onSolo,
  onUpdateTrackProperty,
}) => {
  return (
    <div className="space-y-4">
      {/* Map over tracks and render a lane for each */}
      {mashupData.timeline.tracks.map((track) => (
        <TrackLane
          key={track.stem_path}
          trackData={track}
          totalDuration={totalDuration}
          onMute={onMute}
          onSolo={onSolo}
          onUpdateTrackProperty={onUpdateTrackProperty}
          currentTime={currentTime}
        />
      ))}
    </div>
  );
};