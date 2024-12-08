import './songCard.css';

const trimFeatArtists = (trackTitle) => {
  return trackTitle
    .replace(
      /(\s?[-–]\s?with\s.+?$)|(\s?\((feat\.|with)\s?.+?\))|(\s?\[with\s?.+?\])|(\sfeat\.\s.+?$)|(\sFEAT\.\s.+?$)/gi,
      ''
    )
    .trim();
};



export default function SongCard({ song, onSelect }) {
  return (
    <div
    className="song-card flex items-center p-2 border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
    onClick={onSelect}
    >
      <img
        src={song.album?.images?.[0]?.url || '/default-album.png'}
        alt={song.name}
        width={32}
        className="w-10 h-10 rounded mr-4"
      />
      <p className="text-white text-sm flex-grow">{trimFeatArtists(song.name)}</p>
    </div>
  );
}
