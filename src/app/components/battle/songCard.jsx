export default function SongCard({ song, onSelect }) {
  return (
    <div
      className="song-card flex items-center justify-between p-4 bg-gray-800 rounded mb-2 cursor-pointer"
      onClick={onSelect}
    >
      <img
        src={song.album?.images?.[0]?.url || '/default-album.png'}
        alt={song.name}
        className="w-12 h-12 rounded"
      />
      <div className="flex-1 ml-4">
        <p className="text-white text-lg">{song.name}</p>
        <p className="text-gray-400 text-sm">
          {song.artists.map((artist) => artist.name).join(', ')}
        </p>
      </div>
    </div>
  );
}

