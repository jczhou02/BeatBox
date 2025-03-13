// src/components/layout/BottomMusicBar.tsx
import { useState } from 'react';
import { FaChevronUp, FaChevronDown, FaMusic, FaList, FaSearch } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

export default function BottomMusicBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('song'); // 'song' or 'playlist'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { data: session } = useSession();

  const toggleBar = () => {
    setIsOpen(!isOpen);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/spotify/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to search');
      }
      const data = await response.json();
      setSearchResults(data.tracks?.items || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = async (track: any) => {
    // Implement your logic to add the track to your DAW
    console.log('Adding track:', track);
    // You would typically send this to your backend or add it to your state
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-[#0c0d0e] transition-all duration-300 ${isOpen ? 'h-64' : 'h-10'}`}>
      {/* Toggle button */}
      <div className="flex justify-center">
        <button 
          className="text-white hover:text-green-400 w-10 h-10 flex items-center justify-center"
          onClick={toggleBar}
        >
          {isOpen ? <FaChevronDown /> : <FaChevronUp />}
        </button>
      </div>

      {/* Content area - only visible when open */}
      {isOpen && (
        <div className="flex h-full">
          {/* Mini sidebar */}
          <div className="w-16 bg-[#202324] flex flex-col items-center py-4">
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
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'song' && (
              <div>
                <h3 className="text-white text-lg mb-3">Add Track</h3>
                <div className="flex mb-4">
                  <input
                    type="text"
                    placeholder="Search for a track..."
                    className="flex-1 p-2 bg-[#202324] text-white rounded-l outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    className="bg-green-500 text-white px-4 rounded-r hover:bg-green-600"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? 'Searching...' : <FaSearch />}
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-32 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="divide-y divide-gray-800">
                      {searchResults.map((track) => (
                        <li key={track.id} className="py-2 flex justify-between text-white">
                          <div>
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-gray-400">{track.artists.map(a => a.name).join(', ')}</div>
                          </div>
                          <button
                            className="bg-green-500 text-white text-xs px-2 rounded hover:bg-green-600"
                            onClick={() => handleAddTrack(track)}
                          >
                            Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : searchQuery && !isSearching ? (
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
        </div>
      )}
    </div>
  );
}