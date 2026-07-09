'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Project, Track, UploadedTrack, MashupData } from '@/types';
import { TransportControls } from './TransportControls';
import { TrackList } from './TrackList';
import { UploadArea } from './UploadArea';
import { useToneAudioEngine } from '@/hooks/useAudioEngine';
import BottomMusicBar from './BottomMusicBar';
import MashupVisualizer from './MashupVisualizer';
import { SpotifyPlayerProvider } from '@/context/SpotifyPlayerProvider';
import { FaFileAudio } from 'react-icons/fa';
import { CgSpinner } from 'react-icons/cg';
import { toast } from 'react-hot-toast';
import CollapsibleSection from '../CollapsibleSection';
import MashupTable from './MashupTable/Table';

interface DawEditorProps {
  initialProject: Project;
  onSave: (project: Project) => Promise<Project | void>; 
  // You can pass an optional callback to "save" the project if you want
  isNew?: boolean; 
  // Maybe you want to treat new projects differently
}

const PENDING_SAVE_KEY = 'unsavedDabiProject';
const LOGIN_INTENT_KEY = 'dabiLoginRedirect';

export const DawEditor: React.FC<DawEditorProps> = ({
  initialProject,
  onSave,
  isNew = false
}) => {
  const { data: session, status } = useSession();

  const [project, setProject] = useState<Project>(initialProject);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(project.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const initialProjectRef = useRef(initialProject);

  const [showUpload, setShowUpload] = useState(false);
  const [gradientColors, setGradientColors] = useState({
    topRight: ['#095b63', '#6623D1', '#904314'],
    bottomLeft: ['#3a0647', '#89216b', '#4f0e5b'],
    bottomRight: ['#1e3b70', '#2a6bb8', '#097969']
  });
  const [softTracks, setSoftTracks] = useState<Track[]>([]);
  const [showMashupVisualizer, setShowMashupVisualizer] = useState(false);

  const mashupData = project.mashupData;
  const curateData = project.curateData;
  const lastSavedProjectRef = useRef(initialProject);
  const pathname = usePathname();
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
    setProject(prev => ({ ...prev, mashupData: newMashupData }));
    setShowMashupVisualizer(false); // Close the modal
  }, []);

  useEffect(() => {
    console.log('softTracks', softTracks);
  }, [softTracks]);

  useEffect(() => {
    generateRandomGradient();
  }, []);


  useEffect(() => {
    if (!isNew) return;
    const loginIntent = sessionStorage.getItem(LOGIN_INTENT_KEY);
    const pendingProjectJSON = localStorage.getItem(PENDING_SAVE_KEY);

    if (loginIntent === 'true' && pendingProjectJSON) {
      console.log("LOGIN INTENT DETECTED: Hydrating project state from localStorage.");
      try {
        const pendingProject = JSON.parse(pendingProjectJSON);
        setProject(pendingProject); // This triggers a re-render with the user's data
      } catch (e) {
        console.error("Failed to parse pending project from localStorage", e);
        // Clean up bad data if parsing fails
        localStorage.removeItem(PENDING_SAVE_KEY);
      } finally {
        // IMPORTANT: Clear the intent flag so this doesn't run again on a simple page refresh
        sessionStorage.removeItem(LOGIN_INTENT_KEY);
      }
    }
  }, [isNew]);


  // --- CHANGE DETECTION ---
  useEffect(() => {
    // Compare current project state with the initial state to set the dirty flag
    const isDifferent = JSON.stringify(project) !== JSON.stringify(initialProjectRef.current);
    setIsDirty(isDifferent);
  }, [project]);


  // --- NEW: POST-LOGIN AUTOMATIC SAVE ---
  useEffect(() => {
    if (!isNew) return;
    const pendingProjectJSON = localStorage.getItem(PENDING_SAVE_KEY);
    
    if (pendingProjectJSON && status === 'authenticated' && session?.user?.id) {
      console.log("User is authenticated and a pending project exists. Triggering auto-save.");
      
      localStorage.removeItem(PENDING_SAVE_KEY);

      const performAutomaticSave = async () => {
        setIsSaving(true);
        try {
          // The `project` state is already hydrated with the user's work.
          // We just need to add the user_id before saving.
          const projectToSave = { ...JSON.parse(pendingProjectJSON), user_id: session.user.id as string };
          
          const savedProject = await onSave(projectToSave);
          // onSave will likely redirect, but if it doesn't, we update the state
          if (savedProject) {
              setProject(savedProject);
              lastSavedProjectRef.current = savedProject;
              setIsDirty(false);
          }

        } catch (error) {
          console.error("Automatic save failed:", error);
          toast.error("We couldn't automatically save your project. Please try saving again.");
          // Put the data back so the user can retry manually
          localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(project));
        } finally {
          setIsSaving(false);
        }
      };

      performAutomaticSave();
    }
  }, [status, session, onSave, project, isNew]);


  // --- MODIFIED: SAVE LOGIC ---
  const handleSave = useCallback(async () => {
    if (!isDirty || isSaving) return;

    if (status === 'authenticated') {
      setIsSaving(true);
      try {
        const projectWithUser = {...project, user_id: session?.user?.id as string};
        const savedProject = await onSave(projectWithUser);
        // onSave may redirect. If not, update state to reflect the saved version.
        if (savedProject) {
          lastSavedProjectRef.current = savedProject;
          setProject(savedProject);
        } else {
          // If onSave doesn't return the project, assume the current state is the saved state
          lastSavedProjectRef.current = project;
          setIsDirty(false);
        }
      } catch (error) {
        console.error("Save failed:", error);
        toast.error("Failed to save project.");
      } finally {
        setIsSaving(false);
      }
    } 
    else {
      // Unauthenticated flow
      const confirmation = window.confirm(
        "You need to log in to save your work.\n\nWe'll save your project automatically after you log in with Spotify. Continue?"
      );

      if (confirmation) {
        try {
          // Store current state and set intent flags
          localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(project));
          sessionStorage.setItem(LOGIN_INTENT_KEY, 'true');
          // Initiate login
          console.log("Redirecting to Spotify login with callback URL:", pathname);
          signIn('spotify', { callbackUrl: `${window.location.origin}${pathname}` });
        } catch (error) {
          console.error("Could not save state to localStorage:", error);
          toast.error("Could not prepare your project for saving. Please try again.");
        }
      }
    }
  }, [project, isDirty, isSaving, onSave, status, session, pathname]);


  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // --- PROJECT NAME EDITING ---
  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const handleNameClick = () => {
    setTempName(project.name);
    setIsEditingName(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  };

  const handleNameBlur = () => {
    setIsEditingName(false);
    // Revert changes if clicked outside
    setTempName(project.name);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tempName.trim() && tempName !== project.name) {
        setProject(p => ({ ...p, name: tempName.trim() }));
      }
      setIsEditingName(false);
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setTempName(project.name);
    }
  };

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


  if (isSaving && localStorage.getItem(PENDING_SAVE_KEY) === null) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-white">
              <CgSpinner className="animate-spin text-4xl mb-4" />
              <p>Saving your project...</p>
          </div>
      );
  }

  return (
  <SpotifyPlayerProvider>
    <div className="min-h-screen p-3 relative" style={backgroundStyle}>    {/* <div className="absolute inset-0 bg-black bg-opacity-50" /> */}
     {/* Optional refresh button for gradient */}
     <button 
        onClick={generateRandomGradient}
        className="absolute bottom-1 right-1.5 bg-black bg-opacity-30 hover:bg-opacity-50 text-white p-2 rounded-full z-30"
        title="Refresh background"
      >
        🔄
      </button>
      {/* Top bar, project name, etc. */}
      <header className="flex items-center justify-between mb-6">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={tempName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="text-2xl font-bold bg-transparent border-b-2 border-pink-500 text-white outline-none"
            />
          ) : (
            <h1
              className="text-2xl font-bold text-white cursor-pointer hover:bg-white/10 p-1 rounded"
              onClick={handleNameClick}
              title="Click to edit name"
            >
              {project.name}{isDirty ? ' *' : ''}
            </h1>
          )}

          <div className='flex items-center space-x-2'>
          <button
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white"
                onClick={handleMashup}
              >
                Mashup
              </button>
            <button
              className="bg-[#0c0d0e] hover:bg-green-700 px-2 py-2 rounded text-white"
              onClick={() => setShowUpload(true)}
            >
              <FaFileAudio />
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed px-1.5 py-1.5 rounded text-white flex items-center space-x-2"
            >
              {isSaving ? (
                <CgSpinner className="animate-spin" />
              ) : (
                <span>Save</span>
              )}
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
      <div>
          <div className="my-6">
            <CollapsibleSection title="Mashup Timeline" defaultOpen>
              {!mashupData && (
              <div className="text-gray-500 text-center py-16 border-2 border-dashed border-gray-700 rounded-lg">
                <p>Your generated mashup will appear here!</p>
                <p className="text-sm">Use the &apos;Mashup&apos; button to begin.</p>
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
                Create a mashup to see the audio timeline here.
              </p>
            )}
            </CollapsibleSection> 
          </div>
          <div className='my-6'>
            <CollapsibleSection title="Mashup Table" defaultOpen>
              {curateData && softTracks.length ? (
              <MashupTable
                softTracks={softTracks as any} // matches IncomingTrack type: name, artists[], anchor?
                onRemove={(title, artist) => {
                  setSoftTracks(prev => prev.filter(t => !(t.name === title && "artists" in t && t.artists?.[0]?.name && t.artists.map(a => a.name).join(", ") === artist)));
                }}
              />
            ) : (
              <>
              <div className="text-gray-500 text-center py-16 border-2 border-dashed border-gray-700 rounded-lg">
                <p>Your curated table will appear here!</p>
                <p className="text-sm">Use the &apos;Mashup&apos; button to begin.</p>
              </div>
              <p className="text-gray-400 text-center py-8">
                Create a mashup to see the timeline here.
              </p>
              </>
            )}
            </CollapsibleSection>
          </div>
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
