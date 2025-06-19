import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, Track, UploadedTrack, MashupData } from '@/types';
import { TransportControls } from './TransportControls';
import { TrackList } from './TrackList';
import { UploadArea } from './UploadArea';
import { useToneAudioEngine } from '@/hooks/useAudioEngine';
import BottomMusicBar from './BottomMusicBar';
import MashupVisualizer from './MashupVisualizer';
import { SpotifyPlayerProvider } from '@/context/SpotifyPlayerProvider';
import { FaFileAudio } from 'react-icons/fa';

interface DawEditorProps {
  initialProject: Project;
  onSave: (project: Project) => void; 
  // You can pass an optional callback to "save" the project if you want
  isNew?: boolean; 
  // Maybe you want to treat new projects differently
}


export const DawEditor: React.FC<DawEditorProps> = ({
  initialProject,
  onSave,
  isNew = false
}) => {
  const [project, setProject] = useState<Project>(initialProject);
  const [showUpload, setShowUpload] = useState(false);
  const [gradientColors, setGradientColors] = useState({
    topRight: ['#095b63', '#6623D1', '#904314'],
    bottomLeft: ['#3a0647', '#89216b', '#4f0e5b'],
    bottomRight: ['#1e3b70', '#2a6bb8', '#097969']
  });
  const [mashupData, setMashupData] = useState<MashupData | null>(null);
  const [softTracks, setSoftTracks] = useState<Track[]>([]);
  const [showMashupVisualizer, setShowMashupVisualizer] = useState(false);

  const {
    isLoaded,
    isPlaying,
    currentTime,
    totalDuration,
    togglePlayback,
    seekTo,
    updateTrackProperty,
    toggleMute,
    toggleSolo,
  } = useToneAudioEngine(mashupData);

  // For BPM changes (local or server)
  const handleBpmChange = (newBpm: number) => {
    setProject((prev) => ({ ...prev, bpm: newBpm }));
    // If you want to persist to the server, call onSave or do a fetch here
  };

  const handleFilesAccepted = async (files: File[]) => {
    // If you'd like to upload them to the server, do so here.
    // Otherwise, you can store them in memory or generate local URLs, etc.
    // For now, let's just create mock tracks to demonstrate
    const newTracks: UploadedTrack[] = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name,
      source: 'upload',
      fileUrl: URL.createObjectURL(file), // local object URL
      isMuted: false,
      isSoloed: false,
      anchor: false,
    }));

    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, ...newTracks]
    }));

    setShowUpload(false);
  };

  const handleMashup = useCallback(() => {
    // Make sure there are tracks to mashup
    if (softTracks.length > 0) {
        setShowMashupVisualizer(true);
    } else {
        alert("Please add some tracks from the music bar below first!");
    }
  }, [softTracks]);

  const handleMashupComplete = useCallback((newMashupData: MashupData) => {
    console.log("DawEditor received new mashup data, updating state:", newMashupData);
    setMashupData(newMashupData); // Update the correct state variable
    setShowMashupVisualizer(false); // Close the modal
  }, []);

  useEffect(() => {
    console.log('softTracks', softTracks);
  }, [softTracks]);

  useEffect(() => {
    generateRandomGradient();
  }, []);

  const generateRandomGradient = () => {
    // Palette of colors to choose from
    const colorPalette = [
      // Blues & Teals
      '#095b63', '#0a7d8c', '#09b9b9', '#2a6bb8',
      // Purples
      '#6623D1', '#9400d3', '#4b0082', '#89216b',
      // Oranges & Reds
      '#b75010', '#9f4f41', '#c07711', '#8b0000', '#b63553',
      // Greens
      '#097969', '#228b22', '#2e8b57', '#006400', '#355e3b',
      // Dark tones
      '#323258', '#1e2e57', '#0f3460', '#1b4b1f', '#487c84'
    ];
    
    // Helper to grab random colors from our palette
    const getRandomColors = (count: number) => {
      const result = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * colorPalette.length);
        result.push(colorPalette[randomIndex]);
      }
      return result;
    };

    setGradientColors({
      topRight: getRandomColors(3),
      bottomLeft: getRandomColors(3),
      bottomRight: getRandomColors(3)
    });
  };

  // Create the gradient CSS string
  const backgroundStyle = useMemo(() => ({
    background: `
      radial-gradient(circle at top right, ${gradientColors.topRight[0]}, ${gradientColors.topRight[1]}, ${gradientColors.topRight[2]}),
      radial-gradient(circle at bottom left, ${gradientColors.bottomLeft[0]}50, ${gradientColors.bottomLeft[1]}40, ${gradientColors.bottomLeft[2]}30),
      radial-gradient(circle at bottom right, ${gradientColors.bottomRight[0]}, ${gradientColors.bottomRight[1]}, ${gradientColors.bottomRight[2]})
    `,
    backgroundBlendMode: 'overlay'
  }), [gradientColors]);


  return (
  <SpotifyPlayerProvider>
    <div className="min-h-screen p-3 relative" style={backgroundStyle}>    {/* <div className="absolute inset-0 bg-black bg-opacity-50" /> */}
     {/* Optional refresh button for gradient */}
     <button 
        onClick={generateRandomGradient}
        className="absolute bottom-1 right-1.5 bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-2 rounded-full z-10"
        title="Refresh background"
      >
        🔄
      </button>
      {/* Top bar, project name, etc. */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {project.name}{isNew ? ' *' : ''}
        </h1>
        <div className='flex space-x-2'>
        <button
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white"
              onClick={handleMashup}
            >
              Mashup
            </button>
          <button
            className="bg-[#0c0d0e] hover:bg-green-700 px-1.5 py-1.5 rounded text-white"
            onClick={() => setShowUpload(true)}
          >
            <FaFileAudio />
          </button>
        </div>
      </header>

      {/* Transport controls */}
      <TransportControls
        isPlaying={isPlaying}
        bpm={project.bpm}
        onPlayPause={togglePlayback}
        onBpmChange={handleBpmChange}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSeek={seekTo}
        isLoaded={isLoaded}
      />

      {/* Tracks */}
      <div className="my-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Mashup Timeline</h2>
          </div>

          {!mashupData && (
            <div className="text-gray-500 text-center py-16 border-2 border-dashed border-gray-700 rounded-lg">
              <p>Your generated mashup will appear here.</p>
              <p className="text-sm">Use the &apos;Create Mashup&apos; button to begin.</p>
            </div>
          )}

          {mashupData && !isLoaded && (
             <div className="text-blue-400 text-center py-16">Loading audio assets...</div>
          )}

          {isLoaded && mashupData ? (
            <TrackList
              mashupData={mashupData}
              currentTime={currentTime}
              totalDuration={totalDuration}
              onMute={toggleMute}
              onSolo={toggleSolo}
              onUpdateTrackProperty={updateTrackProperty}
            />
          ) : (
            <p className="text-gray-400 text-center py-8">
              Create a mashup to see the timeline here.
            </p>
          )}
        </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Upload Tracks</h2>
            <UploadArea onFilesAccepted={handleFilesAccepted} />
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

        <div className="relative h-full">
        
          <BottomMusicBar softTracks={softTracks} setSoftTracks={setSoftTracks}/>
        </div>
        {showMashupVisualizer && (
          <MashupVisualizer
            tracks={softTracks}
            onUpdateTracks={(updatedTracks) =>
              // setProject((prev) => ({ ...prev, tracks: updatedTracks }))
              console.log('updatedTracks', updatedTracks)
            }
            onClose={() => setShowMashupVisualizer(false)}
            updateDAWState={handleMashupComplete}
          />
        )}
    </div>
  </SpotifyPlayerProvider>
  );
};
