// src/hooks/useToneAudioEngine.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { MashupData, MashupTrackData } from '@/types';

const getStemName = (path: string): string => {
  return path.split('/').pop()?.split('.')[0] || `track-${Date.now()}`;
};

export const useToneAudioEngine = (mashupData: MashupData | null) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [soloedTrack, setSoloedTrack] = useState<string | null>(null);

  // **** CHANGE 1: This ref will now hold GrainPlayers ****
  const playersRef = useRef<Map<string, Tone.GrainPlayer>>(new Map());
  const channelsRef = useRef<Map<string, Tone.Channel>>(new Map());
  const partsRef = useRef<Tone.Part[]>([]);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const cleanup = () => {
      console.log('Cleaning up previous audio engine state...');
      if (Tone.getTransport().state !== 'stopped') {
        Tone.getTransport().stop();
      }
      Tone.getTransport().cancel();
      cancelAnimationFrame(animationFrameRef.current);
      
      partsRef.current.forEach(part => part.dispose());
      partsRef.current = [];

      channelsRef.current.forEach(channel => channel.dispose());
      channelsRef.current.clear();
      
      playersRef.current.forEach(player => player.dispose());
      playersRef.current.clear();
      
      setIsLoaded(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setTotalDuration(0);
      setSoloedTrack(null);
    };

    if (!mashupData) {
      cleanup();
      return;
    }
    
    cleanup();

    const setupAudio = async () => {
      // --- Create Mixer Channels first ---
      mashupData.timeline.tracks.forEach((trackData: MashupTrackData) => {
        const stemName = getStemName(trackData.stem_path);
        const channel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
        channelsRef.current.set(stemName, channel);
      });

      // --- Create and Load GrainPlayers ---
      // We load each player individually to connect it to its channel.
      const loadPromises = mashupData.timeline.tracks.map(trackData => {
          const stemName = getStemName(trackData.stem_path);
          const url = mashupData.stem_urls[trackData.stem_path];
          
          if (!url) {
              console.error(`No signed URL found for stem_path: ${trackData.stem_path}`);
              return Promise.resolve();
          }
          
          const player = new Tone.GrainPlayer({ url })
              .connect(channelsRef.current.get(stemName)!); 
          
          playersRef.current.set(trackData.stem_path, player);
          return player.loaded;
      });

      // --- Create and Schedule Parts ---
      let maxDuration = 0;
      mashupData.timeline.tracks.forEach((trackData: MashupTrackData) => {
        const stemName = getStemName(trackData.stem_path);
        const player = playersRef.current.get(trackData.stem_path);
        if (!player) return;

        const partEvents = trackData.clips.map(clip => {
          // The duration in the timeline is affected by the playback rate
          const clipEffectiveDuration = clip.source_duration / clip.playback_rate;
          const clipEndTime = clip.project_start_time + clipEffectiveDuration;
          if (clipEndTime > maxDuration) {
            maxDuration = clipEndTime;
          }
          return {
            time: clip.project_start_time,
            offset: clip.source_start_time,
            duration: clip.source_duration, // GrainPlayer needs the original source duration
            playbackRate: clip.playback_rate,
          };
        });

        const part = new Tone.Part<{time: number, offset: number, duration: number, playbackRate: number}>(
          (time, event) => {
            // Set playback rate for this specific clip
            player.playbackRate = event.playbackRate;
            // The duration passed to start() is how long it should play for in the getTransport()'s time,
            // which is the *effective* duration.
            const effectiveDuration = event.duration / event.playbackRate;
            player.start(time, event.offset, effectiveDuration);
            console.log(`Starting ${stemName} at ${time} seconds with offset ${event.offset} and duration ${effectiveDuration}`);
          },
          partEvents
        ).start(0);

        partsRef.current.push(part);
      });

      setTotalDuration(maxDuration);
      Tone.getTransport().loopEnd = maxDuration;
      Tone.getTransport().loop = true;

      // Wait for all players to load
      await Promise.all(loadPromises.filter(p => p !== null));
      console.log("Audio engine loaded successfully!");
      setIsLoaded(true);
    };

    setupAudio();

    return cleanup;
  }, [mashupData]);

  // Animation loop (no changes needed here)
  useEffect(() => {
    const loop = () => {
      setCurrentTime(Tone.getTransport().seconds);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying]);


  // --- PUBLIC CONTROLS ---

  const togglePlayback = useCallback(async () => {
    if (!isLoaded) return;
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    
    if (Tone.getTransport().state === 'started') {
      playersRef.current.forEach(player => {
        player.stop();
      });
      Tone.getTransport().pause();
      setIsPlaying(false);
    } else {
      const resumeTime = Tone.getTransport().seconds;

      if (resumeTime > 0) {
      mashupData?.timeline.tracks.forEach(trackData => {
        const player = playersRef.current.get(trackData.stem_path);
        if (!player) return;
        trackData.clips.forEach(clip => {
          const clipStart = clip.project_start_time;
          const clipDur   = clip.source_duration / clip.playback_rate;
          const clipEnd   = clipStart + clipDur;
          if (resumeTime >= clipStart && resumeTime < clipEnd) {
            const timeIntoClip   = resumeTime - clipStart;
            const sourceOffset   = clip.source_start_time + timeIntoClip * clip.playback_rate;
            const remainingDur   = clipEnd - resumeTime;
            player.playbackRate = clip.playback_rate;
            // schedule *only* this one manual restart
            player.start(Tone.now(), sourceOffset, remainingDur);
            console.log(`Resuming ${trackData.stem_path} at ${resumeTime} seconds`);
          }
        });
      });
    }

    // now fire off the transport once
    Tone.getTransport().start();
    setIsPlaying(true);
  }
}, [isLoaded, mashupData]);

  // seekTo is fine, but we'll ensure the state is updated correctly
  const seekTo = useCallback((time: number) => {
    if (!isLoaded || time < 0 || time > totalDuration) return;
    Tone.getTransport().seconds = time;
    setCurrentTime(time); // Immediately update UI
  }, [isLoaded, totalDuration]);

  // updateTrackProperty is fine (no changes needed)
  const updateTrackProperty = useCallback((stemPath: string, property: 'volume' | 'pan', value: number) => {
    const stemName = getStemName(stemPath);
    const channel = channelsRef.current.get(stemName);
    if (channel) {
      if (property === 'volume') {
        channel.volume.value = value > 0.01 ? Tone.gainToDb(value) : -Infinity;
      }
      if (property === 'pan') {
        channel.pan.value = value;
      }
    }
  }, []);

  // toggleMute is fine (no changes needed)
  const toggleMute = useCallback((stemPath: string, isMuted: boolean) => {
    const stemName = getStemName(stemPath);
    const channel = channelsRef.current.get(stemName);
    if (channel) {
      channel.mute = isMuted;
    }
  }, []);
  
  // toggleSolo is fine (no changes needed)
  const toggleSolo = useCallback((stemPath: string, shouldBeSoloed: boolean) => {
    const newSoloedTrack = shouldBeSoloed ? getStemName(stemPath) : null;
    setSoloedTrack(newSoloedTrack);

    channelsRef.current.forEach((channel, name) => {
        if (newSoloedTrack) {
            channel.mute = name !== newSoloedTrack;
        } else {
            channel.mute = false;
        }
    });
  }, []);

  return {
    isLoaded,
    isPlaying,
    currentTime,
    totalDuration,
    togglePlayback,
    seekTo,
    updateTrackProperty,
    toggleMute,
    toggleSolo,
  };
};