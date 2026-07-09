import React, { useState } from 'react';

interface ExportOptions {
  format: 'mp3' | 'wav' | 'flac';
  quality: 'low' | 'medium' | 'high';
  includeTracks: 'all' | 'unmuted' | 'selected';
  normalizeAudio: boolean;
}

interface ExportModalProps {
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  onClose,
  onExport
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'mp3',
    quality: 'medium',
    includeTracks: 'all',
    normalizeAudio: true
  });
  
  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions({ ...options, format: e.target.value as 'mp3' | 'wav' | 'flac' });
  };
  
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions({ ...options, quality: e.target.value as 'low' | 'medium' | 'high' });
  };
  
  const handleIncludeTracksChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOptions({ ...options, includeTracks: e.target.value as 'all' | 'unmuted' | 'selected' });
  };