import React, { useState, useEffect } from 'react';
import { getUserPlaylists, getPlaylistWithTracks, SpotifyPlaylist } from '../lib/spotify';

interface SpotifyImportModalProps {
  accessToken: string;
  onClose: () => void;
  onImport: (playlist: SpotifyPlaylist) => void;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  accessToken,
  onClose,
  onImport
}) => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  // Fetch user's playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const data = await getUserPlaylists(accessToken);
        setPlaylists(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError('Failed to fetch your Spotify playlists. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlaylists();
  }, [accessToken]);
  
  const handleImport = async () => {
    if (!selectedPlaylistId) return;
    
    try {
      setLoading(true);
      const playlist = await getPlaylistWithTracks(accessToken, selectedPlaylistId);
      onImport(playlist);
      onClose();
    } catch (err) {
      console.error('Error importing playlist:', err);
      setError('Failed to import playlist. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Import from Spotify</h2>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select a playlist
              </label>
              
              <div className="max-h-64 overflow-y-auto bg-gray-900 rounded">
                {playlists.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No playlists found</p>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className={`p-3 cursor-pointer hover:bg-gray-700 transition ${
                          selectedPlaylistId === playlist.id ? 'bg-gray-700' : ''
                        }`}
                        onClick={() => setSelectedPlaylistId(playlist.id)}
                      >
                        <div className="flex items-center">
                          {playlist.images && playlist.images[0] ? (
                            <img 
                              src={playlist.images[0].url} 
                              alt={playlist.name} 
                              className="w-10 h-10 rounded mr-3" 
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-600 rounded mr-3 flex items-center justify-center">
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                          
                          <div>
                            <div className="font-medium text-white">{playlist.name}</div>
                            <div className="text-xs text-gray-400">
                              {playlist.tracks.total} tracks
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                onClick={onClose}
              >
                Cancel
              </button>
              
              <button
                className={`px-4 py-2 rounded text-white ${
                  selectedPlaylistId
                    ? 'bg-pink-500 hover:bg-pink-600'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
                disabled={!selectedPlaylistId}
                onClick={handleImport}
              >
                Import Selected Playlist
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};