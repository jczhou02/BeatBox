import React, { useEffect, useRef } from 'react';
import { Track } from '@/types';

interface WaveformDisplayProps {
  track: Track;
  currentTime: number;
  color: string;
  height: number;
  onClick: (time: number) => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ 
  track, 
  currentTime, 
  color, 
  height, 
  onClick 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { waveformData } = track;
    const width = canvas.width;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    ctx.fillStyle = color;
    
    const barWidth = width / waveformData.length;
    
    waveformData.forEach((value, index) => {
      const barHeight = value * height;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    
    // Draw playhead
    const playheadPosition = (currentTime / track.duration) * width;
    ctx.fillStyle = 'white';
    ctx.fillRect(playheadPosition, 0, 2, height);
    
  }, [track, currentTime, color, height]);
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / canvas.width) * track.duration;
    
    onClick(clickTime);
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={height}
      onClick={handleClick}
      style={{ width: '100%', height }}
    />
  );
};
