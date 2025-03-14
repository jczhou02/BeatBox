// src/components/layout/BottomMusicBar.tsx
import { useState, useRef, useEffect } from 'react';
import { FaMusic, FaList, FaSearch } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import debounce from 'lodash.debounce';


export default function BottomMusicBar() {
  const minHeight = 40; // Height when closed
  const defaultOpenHeight = 256; // Default height when opened
  
  // Height management states
  const [height, setHeight] = useState(minHeight);
  const [openHeight, setOpenHeight] = useState(defaultOpenHeight);
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('song'); // 'song' or 'playlist'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const { data: session } = useSession();
  
  // Refs for drag handling
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false); // Track if a drag has occurred

  // Toggle between open and closed states only if not a drag
  const toggleBar = () => {
    if (hasDraggedRef.current) {
      // Reset the flag so that future clicks can work normally
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
    
    // Reset drag flag at start of a new drag
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
    
    // If the mouse has moved more than 5px, consider it a drag
    if (Math.abs(e.clientY - startYRef.current) > 5) {
      hasDraggedRef.current = true;
    }
    
    // Calculate the new height; allow dragging up to the viewport height
    const newHeight = Math.max(minHeight, Math.min(startHeightRef.current + deltaY, window.innerHeight));
    setHeight(newHeight);
    
    // Mark as open if taller than the minimum height
    setIsOpen(newHeight > minHeight);
    
    document.body.style.cursor = 'ns-resize';
  };

  // End dragging; no snapping logic here
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

  useEffect(() => {
    if (searchQuery === '') {
      setSearchResults([]);
    } else {
      debouncedSearch(searchQuery);
    }
    return () => debouncedSearch.cancel(); // Clean up debounce
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };
  const controllerRef = useRef<AbortController | null>(null);
  const debouncedSearch = debounce(async (query) => {
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
       const response = await fetch(`/api/spotify/search?query=${encodeURIComponent(query)}`);
       if (response.ok) {
         const data = await response.json();
         setSearchResults(data.tracks?.items || []);
       } else {
         const error = await response.json();
         console.error('Search error:', error.message || 'Unknown error');
       }
     } catch (error) {
       console.error('Search error:', error);
     }
   }, 300); // Adjust debounce delay as needed (300ms is standard)

  const handleAddTrack = async (track: any) => {
    console.log('Adding track:', track);
    // Your logic to add the track goes here
  };

  return (
    <div 
      ref={barRef}
      className="fixed bottom-0 left-0 right-0 bg-[#0c0d0e]"
      style={{ 
        height: `${height}px`,
        transition: isDraggingRef.current ? 'none' : 'height 0.2s ease-out'
      }}
    >
      <div className="h-10 w-full relative flex justify-center items-center" onClick={toggleBar}>
      <div 
        className="w-[450px] h-2 bg-gray-600 rounded-full cursor-ns-resize hover:bg-gray-500 transition-colors"
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (hasDraggedRef.current) {
            // Prevent a click from toggling after a drag.
            hasDraggedRef.current = false;
            e.stopPropagation();
            return;
          }
          toggleBar();
        }}
      ></div>
    </div>

      {/* Content area (visible when open) */}
      {isOpen && (
        <div className="flex h-full" style={{ height: `calc(100% - 10px)` }}>
          {/* Sidebar */}
          <div className="w-20 bg-[#202324] flex flex-col items-center py-4">
            <button 
              className={`p-2 mb-4 rounded ${activeTab === 'song' ? 'bg-green-500 text-white' : 'text-white hover:text-green-400'}`}
              onClick={() => setActiveTab('song')}
            >
              <FaMusic size={20} />
            </button>
            <button 
              className={`p-2 rounded ${activeTab === 'playlist' ? 'bg-green-500 text-white' : 'text-white hover:text-green-400'}`}
              onClick={() => setActiveTab('playlist')}
            >
              <FaList size={20} />
            </button>
          </div>

          {/* Main content area */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            {activeTab === 'song' && (
              <div>
                <h3 className="text-white text-lg mb-3">Add Track</h3>
                <div className="flex mb-4">
                  <input
                    type="text"
                    placeholder="Search for a track..."
                    className="flex-1 p-2 bg-[#202324] text-white rounded-l outline-none"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  />
                  <button onClick={() => setSearchQuery('')}>
                    X
                  </button>
                </div>

                {/* Search Results */}
                <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: `${Math.max(height - 130, 0)}px` }}>
                  {searchResults.length > 0 ? (
                    <ul className="divide-y divide-gray-800">
                      {searchResults.map((track) => (
                        <li key={track.id} className="py-2 flex justify-between text-white">
                          <div>
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-gray-400">
                              {track.artists.map((a: any) => a.name).join(', ')}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : searchQuery && !searchResults ? (
                    <p className="text-gray-400">No tracks found</p>
                  ) : null}
                </div>
              </div>
            )}

            {activeTab === 'playlist' && (
              <div>
                <h3 className="text-white text-lg mb-3">Add Playlist</h3>
                {!session ? (
                  <p className="text-gray-400">Login required to access playlists</p>
                ) : (
                  <p className="text-gray-400">Playlist functionality coming soon</p>
                )}
              </div>
            )}
          </div>
          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
