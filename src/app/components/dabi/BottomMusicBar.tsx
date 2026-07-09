// src/components/layout/BottomMusicBar.tsx
import { useState, useRef, useEffect, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { FaMusic, FaList, FaTrash } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import debounce from 'lodash.debounce';
import Image from 'next/image';
import { DragDropContext, Droppable, DroppableProps, Draggable, DropResult } from 'react-beautiful-dnd';
import { SongTabPlayback } from '@/components/layout/SpotifyPlayerProvider';
import { Track, SpotifyTrack, SpotifyPlaylist } from '@/types';

  // Declare global types for Spotify Web Playback SDK.
  declare global {
    interface Window {
      onSpotifyWebPlaybackSDKReady: () => void;
      Spotify: any;
    }
  }

interface TabAdd {
  type: 'add';           // special tab type for "Add" UI
  mode: 'track' | 'playlist'; // whether it's showing track or playlist UI
  title: string;         // e.g. "Add Track" or "Add Playlist"
}

interface TabSong {
  type: 'song'; // tab with a track
  track: Track;
}

type Tab = TabAdd | TabSong;

export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }
  return <Droppable {...props}>{children}</Droppable>;
};

interface BottomMusicBarProps {
  softTracks: Track[];                     
  setSoftTracks: React.Dispatch<React.SetStateAction<Track[]>>; 
}

export default function BottomMusicBar({ softTracks, setSoftTracks }: BottomMusicBarProps) {
  const minHeight = 40;        // Height when closed
  const defaultOpenHeight = 256; // Default height when opened

  // Height management states
  const [height, setHeight] = useState(minHeight);
  const [openHeight, setOpenHeight] = useState(defaultOpenHeight);
  const [isOpen, setIsOpen] = useState(false);

  // We'll keep a "tabs" array in state:
  // Index 0 is always our "Add" tab (cannot be closed).
  // Additional indexes are "song" tabs that can be closed and (now) reordered.
  const [tabs, setTabs] = useState<Tab[]>([
    {
      type: 'add',
      mode: 'track',
      title: 'Add Track',
    },
  ]);

  const [userPlaylists, setUserPlaylists] = useState<any[]>([]); // Placeholder for user playlists
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null); // Placeholder for selected playlist
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null); // Placeholder for loading playlist ID
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const { data: session } = useSession();

  // The index of whichever tab is currently active
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);


  // Search states (only relevant if the active tab is the "Add" tab and mode=track)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Refs for drag handling (the bar, not the tabs)
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false); // Track if a drag has occurred

  useEffect(() => {
  const tabElement = tabScrollRef.current;
  if (!tabElement) return;

  const handleWheel = (e: WheelEvent) => {
    // We only want to hijack vertical scrolls (deltaY)
    if (e.deltaY !== 0) {
      // Prevent the default vertical page scroll
      e.preventDefault(); 
      
      // Apply the scroll horizontally to our tab bar
      tabElement.scrollBy({
        left: e.deltaY, // Use deltaY for horizontal scroll to mimic touchpad behavior
        behavior: 'smooth',
      });
    }
  };

  // Add the event listener with the { passive: false } option
  // This tells the browser we INTEND to call preventDefault.
  tabElement.addEventListener('wheel', handleWheel, { passive: false });

  // Cleanup function to remove the listener when the component unmounts
  return () => {
    tabElement.removeEventListener('wheel', handleWheel);
  };
}, []);

  useEffect(() => {
  const currentTab = tabs[activeTabIndex];
  const shouldFetch = 
    currentTab.type === 'add' &&
    currentTab.mode === 'playlist' &&
    session &&
    userPlaylists.length === 0; // Only fetch once

  if (shouldFetch) {
    const fetchPlaylists = async () => {
      setIsLoadingPlaylists(true);
      try {
        const res = await fetch('/api/spotify/playlists');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setUserPlaylists(data);
      } catch (error) {
        console.error("Error fetching playlists:", error);
        // You could add some user-facing error state here
      } finally {
        setIsLoadingPlaylists(false);
      }
    };

    fetchPlaylists();
  }
}, [activeTabIndex, session, tabs, userPlaylists.length]);


const clearAllTracks = () => {
  // Reset tracks
  setSoftTracks([]);
  
  // Reset tabs to only keep the first "Add" tab
  setTabs([tabs[0]]);
  
  // Ensure the active tab is the "Add" tab
  setActiveTabIndex(0);
  
  // Close the dialog
  setShowConfirmDialog(false);
};


const handleAddPlaylistTracks = async (playlistId: string) => {
    setLoadingPlaylistId(playlistId);
    try {
      const res = await fetch(`/api/spotify/playlists/${playlistId}`);
      if (!res.ok) throw new Error('Failed to fetch playlist tracks');
      
      const playlist: SpotifyPlaylist = await res.json();
      
      // Extract the full track objects, filtering out any potential nulls
      const tracksFromPlaylist: SpotifyTrack[] = playlist.tracks.items
        .map(item => item.track)
        .filter(Boolean); // Ensures no null/undefined tracks break the logic

      // 2. FILTER FOR UNIQUENESS
      // Create a Set of existing track IDs for efficient lookup (O(1) average time complexity)
      const existingTrackIds = new Set(softTracks.map(t => t.id));

      const newUniqueTracks = tracksFromPlaylist.filter(
        track => !existingTrackIds.has(track.id)
      );

      // If there are no new tracks to add, inform the user and exit.
      if (newUniqueTracks.length === 0) {
        // You can replace alert with a more elegant notification system
        alert("All tracks from this playlist are already in your project.");
        return;
      }

      // 3. PREPARE NEW DATA
      // Create new "song tab" objects for each unique track
      const newSongTabs: TabSong[] = newUniqueTracks.map(track => ({
        type: 'song',
        // Ensure the track object structure is compatible with your `Track` type.
        // If `SpotifyTrack` and `Track` are compatible, this is fine.
        track: track, 
      }));

      // 4. BATCH STATE UPDATES
      // Use the functional form of setState to ensure you're updating based on the latest state.
    startTransition(async () => {
      setSoftTracks(prevTracks => [...prevTracks, ...newUniqueTracks]);
      setTabs(prevTabs => [...prevTabs, ...newSongTabs]);
    });
      // Give the user clear feedback.
      alert(`${newUniqueTracks.length} new track(s) have been added to your project and opened as tabs.`);

    } catch (error) {
      console.error("Error adding playlist tracks:", error);
      // You can replace alert with a more elegant notification system
      alert("An error occurred while adding the playlist tracks.");
    } finally {
      setLoadingPlaylistId(null);
    }
};


  // Toggle between open and closed states only if not a drag
  const toggleBar = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    setHeight(newIsOpen ? openHeight : minHeight);
  };

  // Start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hasDraggedRef.current = false;
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Dragging logic with free, fluid height adjustment
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    if (Math.abs(e.clientY - startYRef.current) > 5) {
      hasDraggedRef.current = true;
    }
    const newHeight = Math.max(minHeight, Math.min(startHeightRef.current + deltaY, window.innerHeight));
    setHeight(newHeight);
    setIsOpen(newHeight > minHeight);
    document.body.style.cursor = 'ns-resize';
  };

  // End dragging
  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
  };

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Update height if the open state changes externally
  useEffect(() => {
    if (!isDraggingRef.current) {
      setHeight(isOpen ? openHeight : minHeight);
    }
  }, [isOpen, openHeight]);

  // ----- SEARCH LOGIC -----
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery]);

  const controllerRef = useRef<AbortController | null>(null);
  const debouncedSearch = debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const res = await fetch(`/api/spotify/search?query=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const error = await res.json();
        console.error('Search error:', error.message || 'Unknown error');
        return;
      }
      const data = await res.json();
      const spotifyTracks: SpotifyTrack[] = (data.tracks?.items || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        album: t.album,
        uri: t.uri,
        isMuted: false,
        isSoloed: false,
        source: 'spotify',
        anchor: false,
        // Include other properties if needed
      }));
      setSearchResults(spotifyTracks);
      setHighlightedIndex(0);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Ignore abort errors
        return;
      }
      console.error('Search error:', err);
    }
  }, 300);
  

  // "Soft add" a track to parent's state and create a new "song tab"
  const handleAddTrack = (track: Track) => {
    const duplicateIndex = tabs.findIndex(
      (tab) => tab.type === 'song' && tab.track.id === track.id
    );
  
    if (duplicateIndex !== -1) {
      // Optionally switch to the existing tab
      setActiveTabIndex(duplicateIndex);
      return; // Exit without adding a duplicate
    }

    // Otherwise...
    // Add to parent's array
    setSoftTracks((prev) => [...prev, track]);

    // Also create a new "song tab" for it
    setTabs((prev) => [
      ...prev,
      { type: 'song', track },
    ]);
    // Switch to that new tab
    // setActiveTabIndex(tabs.length);
  };

  // Remove a “song tab”
  const handleRemoveTab = (index: number) => {
    // If it’s the “Add” tab (index=0), do nothing
    if (index === 0) return;
    const tabToRemove = tabs[index];
    if (tabToRemove.type === 'song') {
      // Also remove from softTracks
      setSoftTracks((prev) => 
        prev.filter(track => track.id !== tabToRemove.track.id)
      );
    }
    setTabs((prev) => {
      const newTabs = [...prev];
      newTabs.splice(index, 1);
      return newTabs;
    });
    if (activeTabIndex === index) {
      setActiveTabIndex(0);
    } else if (activeTabIndex > index) {
      setActiveTabIndex((prev) => prev - 1);
    }
  };

  // Helper to update the "Add" tab's mode (track vs playlist)
  const setAddTabMode = (mode: 'track' | 'playlist') => {
    setTabs((prev) => {
      const newTabs = [...prev];
      if (newTabs[0].type === 'add') {
        newTabs[0].mode = mode;
        newTabs[0].title = mode === 'track' ? 'Add Track' : 'Add Playlist';
      }
      return newTabs;
    });
  };

  // ----- DRAG AND DROP FOR SONG TABS -----
  // We keep the first (Add) tab fixed and allow dragging only for the song tabs (tabs.slice(1))
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index; // index within the song tabs (tabs.slice(1))
    const destinationIndex = result.destination.index;
    const songTabs = tabs.slice(1);
    const [removed] = songTabs.splice(sourceIndex, 1);
    songTabs.splice(destinationIndex, 0, removed);
    const newTabs = [tabs[0], ...songTabs];
    setTabs(newTabs);

    // Update activeTabIndex if necessary (adjust for the fixed "Add" tab)
    if (activeTabIndex > 0) {
      const currentActiveTab = tabs[activeTabIndex];
      const newActiveIndex = songTabs.findIndex(
        (tab) =>
          tab.type === 'song' &&
          tab.track.id === (currentActiveTab as TabSong).track.id
      );
      if (newActiveIndex !== -1) {
        setActiveTabIndex(newActiveIndex + 1);
      }
    }
  };
  
  
  // Render the main content area for whichever tab is active
  const renderTabContent = () => {
    const currentTab = tabs[activeTabIndex];

    // If it's the "Add" tab
    if (currentTab.type === 'add') {
      if (currentTab.mode === 'track') {
        return (
          <div className="flex flex-col w-full h-full -mt-1">
            <div className="flex mb-4">
              <input
                type="text"
                placeholder="Search for a track..."
                className="flex-1 p-2 bg-[#202324] text-white rounded-l outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                      handleAddTrack(searchResults[highlightedIndex]);
                    }
                    e.preventDefault();
                  } else if (e.key === 'ArrowDown') {
                    setHighlightedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
                    e.preventDefault();
                  } else if (e.key === 'ArrowUp') {
                    setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                    e.preventDefault();
                  }
                }}
              />
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 bg-[#202324] text-white rounded-r hover:bg-gray-600"
              >
                X
              </button>
            </div>

            <div className="overflow-y-auto flex-1 no-scrollbar" style={{ maxHeight: `${Math.max(height - 150, 0)}px` }}>
              {searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-800">
                  {searchResults.map((track, i) => (
                    <li
                      key={track.id || i}
                      className={`py-1.5 px-1 flex text-white cursor-pointer transition-colors 
                        ${i === highlightedIndex ? 'bg-gray-700' : 'hover:bg-gray-600'}`}
                      onClick={() => handleAddTrack(track)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                    >
                      <div className="flex items-center">
                        <Image
                          src={(track as SpotifyTrack).album?.images?.[0]?.url || '/default-album.png'}
                          alt={track.name}
                          width={40}
                          height={40}
                          className="w-11 h-11 rounded mr-4"
                        />
                        <div>
                          <div className="font-medium">{track.name}</div>
                          <div className="text-sm text-gray-400">
                            {(track as SpotifyTrack).artists.map((a) => a.name).join(', ')}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : searchQuery ? (
                <p className="text-gray-400">No tracks found</p>
              ) : (
                <p className="text-gray-500">Type to search...</p>
              )}
            </div>
          </div>
        );
      } else {
        // "Add Playlist" mode
        return (
          <div className="flex flex-col w-full h-full">
            {!session ? (
              <p className="text-gray-400">Login required to access playlists.</p>
            ) : isLoadingPlaylists ? (
              <p className="text-gray-400">Loading your playlists...</p>
            ) : (
                <ul className="divide-y divide-gray-800">
                  {userPlaylists.map((playlist) => (
                    <li key={playlist.id} className="py-2 px-1 flex items-center justify-between text-white">
                      <div className="flex items-center">
                        {/* You'll need to add `images` to your getUserPlaylists fetch if you want covers */}
                        <Image
                          src={playlist.images?.[0]?.url || '/default-album.png'}
                          alt={playlist.name || 'Playlist Cover'}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded mr-4"
                        />
                        <div>
                          <div className="font-medium">{playlist.name}</div>
                          <div className="text-sm text-gray-400">{playlist.tracks.total} tracks</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddPlaylistTracks(playlist.id)}
                        disabled={!!loadingPlaylistId || isPending}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-1 px-3 rounded text-sm w-28 flex justify-center items-center"
                      >
                        {loadingPlaylistId===playlist.id? <Loader2 className='h-4 w-4 animate-spin'/> : `Add Tracks`}
                      </button>
                    </li>
                  ))}
                </ul>
            )}
          </div>
        );
      }
    }

    // If it's a "song" tab, show playback details for that track
    if (currentTab.type === 'song') {
      const { track } = currentTab;
      return (
        <div className="flex flex-col w-full h-full">
          <h3 className="text-white text-lg mb-6">{track.name}</h3>
          {/* <p className="text-sm text-gray-400 mb-3">
            Artist(s): {(track as SpotifyTrack).artists.map((a) => a.name).join(', ')}
          </p> */}
          <SongTabPlayback track={track as SpotifyTrack} />
        </div>
      );
    }

    return null;
  };

  const tabScrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={barRef}
      className="fixed bottom-0 left-0 right-0 bg-[#0c0d0e] z-20"
      style={{
        height: `${height}px`,
        transition: isDraggingRef.current ? 'none' : 'height 0.2s ease-out',
      }}
    >
      {/* Top drag handle */}
      <div className="h-10 w-full relative flex justify-center items-center" onClick={toggleBar}>
        <div
          className="w-[450px] h-2 bg-gray-600 rounded-full cursor-ns-resize hover:bg-gray-500 transition-colors"
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (hasDraggedRef.current) {
              hasDraggedRef.current = false;
              e.stopPropagation();
              return;
            }
            toggleBar();
          }}
        />
      </div>

      {/* Content area (visible when open) */}
        <div className="flex h-full" style={{
          height: isOpen ? 'calc(100% - 10px)' : '0px',
          overflow: 'hidden',  // Hide the content when closed
          transition: 'height 0.2s ease-out',
        }}>
          {/* Sidebar for toggling "Add track" vs "Add playlist" */}
          <div className="w-20 bg-[#202324] flex flex-col items-center py-4">
            <button
              className={`p-2 mb-4 rounded ${
                tabs[0].type === 'add' && tabs[0].mode === 'track'
                  ? 'bg-green-500 text-white'
                  : 'text-white hover:text-green-400'
              }`}
              onClick={() => {
                setAddTabMode('track');
                setActiveTabIndex(0);
              }}
            >
              <FaMusic size={20} />
            </button>
            <button
              className={`p-2 rounded ${
                tabs[0].type === 'add' && tabs[0].mode === 'playlist'
                  ? 'bg-green-500 text-white'
                  : 'text-white hover:text-green-400'
              }`}
              onClick={() => {
                setAddTabMode('playlist');
                setActiveTabIndex(0);
              }}
            >
              <FaList size={20} />
            </button>

            <button
              className="p-1 rounded text-white hover:text-red-400 mt-14"
              onClick={() => setShowConfirmDialog(true)}
            >
              <FaTrash size={20} />
            </button>
          </div>
          
          {showConfirmDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowConfirmDialog(false)}
            >
              <div className="bg-[#202324] p-6 rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">Clear All Tracks</h3>
                <p className="text-white mb-6">
                  Are you sure you want to remove all tracks from your project? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
                    onClick={clearAllTracks}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 p-2 overflow-hidden flex flex-col -mt-2">
            {/* Row of "chrome-like" tabs */}
            <div className="flex items-center space-x-1.5 mb-2 px-2">
              {/* Fixed "Add" tab */}
              <div
                className={`
                  relative flex items-center 
                  px-3 py-1 border border-gray-600 rounded-t
                  cursor-pointer
                  ${activeTabIndex === 0 ? 'bg-gray-800 border-b-0' : 'bg-[#1f1f1f] hover:bg-gray-700'}
                `}
                onClick={() => setActiveTabIndex(0)}
              >
                <span className="text-white text-sm mr-2">
                  {(tabs[0] as TabAdd).title}
                </span>
              </div>

              {/* Draggable song tabs */}
            <div ref={tabScrollRef} 
              className="flex-1 overflow-x-auto whitespace-nowrap no-scrollbar"
              >
              <DragDropContext onDragEnd={handleDragEnd}>
                <StrictModeDroppable 
                droppableId="tabs-droppable" direction="horizontal"
                isDropDisabled={false}
                isCombineEnabled={false}
                ignoreContainerClipping={false}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex space-x-2">
                      {tabs.slice(1).map((tab, index) => (
                        <Draggable
                          key={tab.type === 'song' && tab.track.id ? tab.track.id : index}
                          draggableId={tab.type === 'song' && tab.track.id ? tab.track.id : `song-${index}`}
                          index={index}
                        >
                          {(providedDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              className={`
                                relative flex items-center 
                                px-2 py-1 border border-gray-600 rounded-t
                                cursor-pointer
                                ${activeTabIndex === index + 1 ? 'bg-gray-800 border-b-0' : 'bg-[#1f1f1f] hover:bg-gray-700'}
                              `}
                              onClick={() => setActiveTabIndex(index + 1)}
                            >
                              <span className="text-white text-sm mr-2 overflow-hidden overflow-ellipsis whitespace-nowrap">
                                {(tab as TabSong).track.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTab(index + 1);
                                }}
                                className="text-gray-400 hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </StrictModeDroppable>
              </DragDropContext>
            </div>
          </div>

            {/* The "active" tab content fills the rest of the area */}
            <div className="flex-1 p-4 border border-gray-700 bg-[#0c0d0e] rounded text-white overflow-auto -mt-2 no-scrollbar">
              {renderTabContent()}
            </div>
          </div>

          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
        </div>
    </div>
  );
}
