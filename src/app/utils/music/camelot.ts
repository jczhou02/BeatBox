// Musical key is like "A minor" or "C major"
// Return "8A" / "9B" etc.

const MAJOR_TO_CAMELOT: Record<string, string> = {
  "C": "8B", "G": "9B", "D": "10B", "A": "11B", "E": "12B",
  "B": "1B", "F#": "2B", "Gb": "2B", "Db": "3B", "C#": "3B",
  "Ab": "4B", "G#": "4B", "Eb": "5B", "D#": "5B", "Bb": "6B", "A#": "6B", "F": "7B",
};

const MINOR_TO_CAMELOT: Record<string, string> = {
  "A": "8A", "E": "9A", "B": "10A", "F#": "11A", "Gb": "11A",
  "C#": "12A", "Db": "12A", "G#": "1A", "Ab": "1A",
  "D#": "2A", "Eb": "2A", "A#": "3A", "Bb": "3A",
  "F": "4A", "C": "5A", "G": "6A", "D": "7A",
};

export function formatMusicalKey(key: string, scale: string) {
  // Normalize casing & accidentals
  const K = key.replace("♯", "#").replace("♭", "b").toUpperCase();
  const S = scale.toLowerCase().includes("min") ? "minor" : "major";
  return `${K} ${S}`;
}

export function toCamelot(musicalKey: string | null) {
  if (!musicalKey) return null;
  const [note, scale] = musicalKey.split(" ");
  if (!note || !scale) return null;
  if (scale.toLowerCase() === "major") return MAJOR_TO_CAMELOT[note] ?? null;
  if (scale.toLowerCase() === "minor") return MINOR_TO_CAMELOT[note] ?? null;
  return null;
}

// Optional helper: map enharmonics when needed elsewhere
export const noteEnharmonics: Record<string, string[]> = {
  "C#": ["Db"], "Db": ["C#"],
  "D#": ["Eb"], "Eb": ["D#"],
  "F#": ["Gb"], "Gb": ["F#"],
  "G#": ["Ab"], "Ab": ["G#"],
  "A#": ["Bb"], "Bb": ["A#"],
};
