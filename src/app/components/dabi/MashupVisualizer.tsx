// MashupVisualizer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Track, MashupData } from '@/types';

interface MashupVisualizerProps {
  tracks: Track[];
  onUpdateTracks: (updatedTracks: Track[]) => void;
  onClose: () => void;
  updateDAWState?: (mashupData: MashupData) => void;
}

const MashupVisualizer: React.FC<MashupVisualizerProps> = ({ tracks, onUpdateTracks, onClose, updateDAWState }) => {
  // Work on a local copy so we can update anchor flags
  const [localTracks, setLocalTracks] = useState<Track[]>(tracks);
  // Store custom positions (container-relative) for each bubble
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Dimensions
  const containerSize = 500;
  const centerSize = 120;
  const centerRadius = centerSize / 2;
  const bubbleSize = 70;
  const containerCenter = { x: containerSize / 2, y: containerSize / 2 };
  const outerRadius = 180;

  // Refs for container and center
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  // Whenever localTracks change, recalc positions for non-anchored bubbles that either:
  //  - Don't have a custom position yet, or
  //  - Were previously anchored (i.e. positioned at center)
  useEffect(() => {
    setPositions(prev => {
      const newPositions = { ...prev };
      // Sort non-anchored tracks to get a consistent ordering
      const nonAnchored = localTracks.filter(track => !track.anchor).sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      nonAnchored.forEach((track, index) => {
        const currentPos = newPositions[track.id!];
        // If no position exists or the track is currently at center (from previous anchor), update it.
        const isAtCenter =
          currentPos &&
          currentPos.x === containerCenter.x - bubbleSize / 2 &&
          currentPos.y === containerCenter.y - bubbleSize / 2;
        if (!currentPos || isAtCenter) {
          const angle = (2 * Math.PI * index) / (nonAnchored.length || 1);
          newPositions[track.id!] = {
            x: containerCenter.x + outerRadius * Math.cos(angle) - bubbleSize / 2,
            y: containerCenter.y + outerRadius * Math.sin(angle) - bubbleSize / 2
          };
        }
      });
      // Always force anchored tracks to be at the center.
      localTracks.filter(track => track.anchor).forEach(track => {
        newPositions[track.id!] = {
          x: containerCenter.x - bubbleSize / 2,
          y: containerCenter.y - bubbleSize / 2
        };
      });
      return newPositions;
    });
  }, [localTracks, containerCenter.x, containerCenter.y, outerRadius, bubbleSize]);

  // Called when a track bubble is dropped.
  const handleDragEnd = (e: any, info: any, trackId: string) => {
    if (!containerRef.current || !centerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    // Calculate drop position relative to container
    const dropX = info.point.x - containerRect.left;
    const dropY = info.point.y - containerRect.top;

    // Determine center position relative to container
    const centerRect = centerRef.current.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2 - containerRect.left;
    const centerY = centerRect.top + centerRect.height / 2 - containerRect.top;
    const distance = Math.sqrt((dropX - centerX) ** 2 + (dropY - centerY) ** 2);
    const isAnchor = distance <= centerRadius;

    // If another track was already anchored (and is not the current one), capture it
    const previouslyAnchored = localTracks.find(track => track.anchor && track.id !== trackId);

    // Update anchor flags: new track gets anchor if dropped in center; any other anchored track loses it.
    setLocalTracks(prev =>
      prev.map(track => {
        if (track.id === trackId) {
          return { ...track, anchor: isAnchor };
        } else if (isAnchor && track.anchor) {
          return { ...track, anchor: false };
        }
        return track;
      })
    );

    // Update the dragged track's position: snap to center if anchored; else, use drop location.
    setPositions(prev => ({
      ...prev,
      [trackId]: isAnchor
        ? { x: containerCenter.x - bubbleSize / 2, y: containerCenter.y - bubbleSize / 2 }
        : { x: dropX - bubbleSize / 2, y: dropY - bubbleSize / 2 }
    }));

    // For a previously anchored track that lost anchor, update its position to a default computed value.
    if (previouslyAnchored) {
      // Get all non-anchored tracks (including the one that just lost anchor)
      const nonAnchored = localTracks
        .filter(track => !track.anchor || track.id === previouslyAnchored.id)
        .sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      const index = nonAnchored.findIndex(track => track.id === previouslyAnchored.id);
      const angle = (2 * Math.PI * index) / (nonAnchored.length || 1);
      setPositions(prev => ({
        ...prev,
        [previouslyAnchored.id!]: {
          x: containerCenter.x + outerRadius * Math.cos(angle) - bubbleSize / 2,
          y: containerCenter.y + outerRadius * Math.sin(angle) - bubbleSize / 2
        }
      }));
    }
  };

  const handleMashup = async (mode: "mashup" | "mashup-plus", numSuggestions = 0) => {
    try {
        console.log('sending tracks:', localTracks);
        const response = await fetch('/api/mashup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tracks: localTracks, 
                mode, 
                numSuggestions 
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to process mashup: ${errorBody}`);
        }

        // The entire response body is the data we need
        const mashupResult = await response.json();
        
        console.log("Received Mashup Result:", mashupResult);

        if (updateDAWState) {
            // Pass the entire result object up
            updateDAWState(mashupResult);
        }
    } catch (error) {
        console.error('Error creating mashup:', error);
    }
  };


  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Container */}
      <div
        ref={containerRef}
        style={{ width: containerSize, height: containerSize }}
        className="relative bg-gradient-to-r from-gray-900 to-indigo-900 rounded-full shadow-2xl border border-indigo-500/30"
      >
        <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
        <div 
          className="absolute rounded-full border border-indigo-400/20"
          style={{
            width: outerRadius * 2 + 20,
            height: outerRadius * 2 + 20,
            top: containerCenter.y - outerRadius - 10,
            left: containerCenter.x - outerRadius - 10,
          }}
        ></div>
        
        {/* Center Drop Zone */}
        <div
          ref={centerRef}
          style={{
            width: centerSize,
            height: centerSize,
            top: containerCenter.y - centerRadius,
            left: containerCenter.x - centerRadius,
          }}
          className="absolute bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center border-2 border-white/80 shadow-lg shadow-blue-500/50 z-10"
        >
          <span className="text-white font-bold text-sm">ANCHOR</span>
        </div>
        
        {/* Render Track Bubbles */}
        <AnimatePresence>
          {localTracks.map(track => {
            const pos = positions[track.id!] || { x: 0, y: 0 };
            const albumImage = (track as any).album?.images?.[0]?.url ||
                               'https://via.placeholder.com/70?text=No+Image';
            return (
              <motion.div
                key={track.id}
                drag
                dragMomentum={false}
                dragConstraints={containerRef}
                dragElastic={0}
                onDragEnd={(e, info) => handleDragEnd(e, info, track.id!)}
                initial={{ x: pos.x, y: pos.y, scale: 0 }}
                animate={{ 
                  x: pos.x,
                  y: pos.y,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 1000,
                    damping: 20
                  }
                }}
                exit={{ scale: 0 }}
                whileDrag={{ scale: 1.1, zIndex: 50, transition: { duration: 0 } }}
                style={{
                  width: bubbleSize,
                  height: bubbleSize,
                  backgroundImage: `url(${albumImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: track.anchor ? 20 : 5,
                }}
                className={`absolute rounded-full flex items-center justify-center cursor-pointer 
                          shadow-lg overflow-hidden transition-all duration-200
                          ${track.anchor ? 'border-2 border-yellow-300 shadow-yellow-400/50' : 'border border-white/30'}`}
              >
                <div className={`absolute inset-0 flex items-center justify-center 
                              ${track.anchor ? 'bg-yellow-500/30' : 'bg-black/30 hover:bg-black/20'}`}>
                  <span className="text-xs text-white font-bold drop-shadow-md">
                    {track.name.slice(0, 8)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
{/* Close Button */}
<button
        onClick={() => { onUpdateTracks(localTracks); onClose(); }}
        className="absolute top-5 right-5 bg-gradient-to-r from-red-600 to-pink-600 text-white px-2.5 py-1.5 rounded-full font-medium shadow-lg hover:shadow-pink-500/30 transition-all"
      >
        X
      </button>
      
      {/* Mix Dropdown Button */}
      <div className="absolute top-16 right-5">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-md font-medium shadow-lg hover:shadow-purple-500/30 transition-all"
        >
          Mix ▼
        </button>
        
        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-xl z-50 overflow-hidden">
            <button 
              className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
              onClick={() => {
                handleMashup("mashup", 0);
                setDropdownOpen(false);
              }}
            >
              Mashup
            </button>
            <button 
              className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
              onClick={() => {
                handleMashup("mashup-plus", 1);
                setDropdownOpen(false);
              }}
            >
              Mashup (+)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MashupVisualizer;
