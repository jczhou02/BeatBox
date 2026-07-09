import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadAreaProps {
  onFilesAccepted: (files: File[]) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFilesAccepted }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/mp4': ['.m4a'],
      'audio/wav': ['.wav']
    }
  });
  
  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        ${isDragActive ? 'border-pink-500 bg-pink-100 bg-opacity-10' : 'border-gray-600'}`}
    >
      <input {...getInputProps()} />
      <p className="text-gray-300">
        {isDragActive
          ? "Drop the files here..."
          : "Drag 'n' drop audio files here, or click to select files"}
      </p>
      <p className="text-gray-500 text-sm mt-2">
        Supports .mp3, .m4a, and .wav files
      </p>
    </div>
  );
};