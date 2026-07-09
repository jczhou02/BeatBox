import React, { useEffect, useRef } from 'react';

interface WaveformProps {
  waveformData: number[];
  color: string;
  height: number;
  width: number;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}

export const AudioWaveform: React.FC<WaveformProps> = ({
  waveformData,
  color,
  height,
  width,
  currentTime,
  duration,
  onSeek
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    const barWidth = width / waveformData.length;
    const centerY = height / 2;
    
    ctx.fillStyle = color;
    
    waveformData.forEach((value, index) => {
      const barHeight = value * height;
      const x = index * barWidth;
      const y = centerY - (barHeight / 2);
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
    
    // Draw playhead position
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = 'white';
    ctx.fillRect(playheadX, 0, 2, height);
    
  }, [waveformData, color, height, width, currentTime, duration]);
  
  // Handle click to seek
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = (clickX / rect.width) * duration;
    
    onSeek(seekTime);
  };
  
  return (
    <canvas
      ref={canvasRef}
      className="cursor-pointer"
      style={{ width: '100%', height: height }}
      onClick={handleClick}
    />
  );
};
