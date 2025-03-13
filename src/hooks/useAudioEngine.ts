import { useRef, useState, useEffect } from 'react';
import { Track } from '../types';

export const useAudioEngine = (tracks: Track[], projectBpm: number) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);
  
  // Set up tracks
  useEffect(() => {
    if (!audioContextRef.current) return;
    
    // Clean up old tracks
    audioSourcesRef.current.forEach(source => {
      source.disconnect();
    });
    audioElementsRef.current.forEach(element => {
      element.pause();
      element.src = '';
    });
    
    audioSourcesRef.current.clear();
    audioElementsRef.current.clear();
    
    // Set up new tracks
    tracks.forEach(track => {
      const audioElement = new Audio(track.fileUrl);
      audioElement.preload = 'auto';
      
      const source = audioContextRef.current!.createMediaElementSource(audioElement);
      const gainNode = audioContextRef.current!.createGain();
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current!.destination);
      
      if (track.isMuted) {
        gainNode.gain.value = 0;
      }
      
      audioElementsRef.current.set(track.id, audioElement);
      audioSourcesRef.current.set(track.id, source);
    });
  }, [tracks]);
  
  // Play/pause controls
  const togglePlayback = () => {
    if (!audioContextRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    if (isPlaying) {
      audioElementsRef.current.forEach(element => {
        element.pause();
      });
    } else {
      audioElementsRef.current.forEach(element => {
        element.currentTime = currentTime;
        element.play();
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const seekTo = (time: number) => {
    setCurrentTime(time);
    audioElementsRef.current.forEach(element => {
      element.currentTime = time;
    });
  };
  
  const toggleMute = (trackId: string) => {
    // Implementation for muting a track
  };
  
  const toggleSolo = (trackId: string) => {
    // Implementation for soloing a track
  };
  
  return {
    isPlaying,
    currentTime,
    togglePlayback,
    seekTo,
    toggleMute,
    toggleSolo
  };
};
