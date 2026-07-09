import { Track } from '../types';
import { generateWaveformData, analyzeAudio } from '../lib/waveform';

/**
 * Process uploaded audio files
 * @param files Array of uploaded audio files
 * @returns Promise resolving to processed Track objects
 */
export async function processAudioFiles(files: File[]): Promise<Omit<Track, 'id'>[]> {
  return Promise.all(
    files.map(async (file) => {
      // Generate a URL for the uploaded file
      const fileUrl = URL.createObjectURL(file);
      
      // Extract file name without extension
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      
      // Generate waveform data
      const waveformData = await generateWaveformData(file);
      
      // Analyze for BPM and key
      const { bpm, key } = await analyzeAudio(file);
      
      // Calculate duration - in a real implementation, you would use Web Audio API
      // to get the actual duration of the audio file
      const durationInSeconds = Math.floor(Math.random() * 180) + 120; // Random between 2-5 minutes
      
      // Generate a random color for the track visualization
      const colors = ['#FF4081', '#7C4DFF', '#00E5FF', '#76FF03', '#FF9100'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      return {
        name: fileName,
        source: 'upload' as const,
        fileUrl,
        waveformData,
        bpm,
        key,
        duration: durationInSeconds,
        color,
        isMuted: false,
        isSoloed: false
      };
    })
  );
}