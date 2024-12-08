export default function BattleOverCard({ totalTime, streak, usedArtists, usedGenres, onSave, onPlayAgain, onReturnToLobby }) {
    return (
      <div className="battle-over-card bg-red-800 text-white p-4 rounded-lg shadow-lg w-3/4 mb-4">
        <h2 className="text-lg font-bold">Battle Summary</h2>
        <p>Battle Length: 🎵 {totalTime}s</p>
        <p>Streak: 🔥 {streak}</p>
        <p>Different Artists: {usedArtists}</p>
        <p>Different Genres: {usedGenres}</p>
        <div className="flex justify-around mt-4">
          <button onClick={onSave} className="bg-gray-600 px-3 py-1 rounded">💾 Save</button>
          <button onClick={onPlayAgain} className="bg-green-600 px-3 py-1 rounded">🔄 Play Again</button>
          <button onClick={onReturnToLobby} className="bg-blue-600 px-3 py-1 rounded">🏠 Lobby</button>
        </div>
      </div>
    );
  }