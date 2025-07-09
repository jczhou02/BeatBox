import React from 'react';
import { motion } from 'framer-motion';
import { FaThermometerHalf } from 'react-icons/fa';
import { PiMusicNotesPlusFill } from 'react-icons/pi';

interface MashupHUDProps {
  temperature: number;
  count: number;
  maxCount: number;
  onTemperatureChange: (newTemp: number) => void;
  onCountChange: (newCount: number) => void;
}

const hudVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, y: -20 },
};

export const MashupHUD: React.FC<MashupHUDProps> = ({
  temperature,
  count,
  maxCount,
  onTemperatureChange,
  onCountChange,
}) => {
  return (
    <motion.div
      variants={hudVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4 w-80 p-4 bg-gray-900/70 backdrop-blur-md rounded-lg shadow-2xl border border-white/20 z-50"
    >
      <div className="space-y-4">
        {/* Temperature Control */}
        <div className="flex items-center space-x-3 text-white">
          <FaThermometerHalf className="text-orange-400" size={20} />
          <label htmlFor="temp-slider" className="font-semibold w-28">
            Creativity
          </label>
          <input
            id="temp-slider"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={temperature}
            onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
            className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="font-mono text-lg w-12 text-right">
            {temperature.toFixed(2)}
          </span>
        </div>

        {/* Count Control */}
        <div className="flex items-center space-x-3 text-white">
          <PiMusicNotesPlusFill className="text-purple-400" size={20} />
          <label htmlFor="count-input" className="font-semibold w-28">
            Suggestions
          </label>
          <input
            id="count-input"
            type="number"
            min="0"
            max={maxCount}
            step="1"
            value={count}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              // Prevent invalid input
              if (!isNaN(val) && val >= 0 && val <= maxCount) {
                onCountChange(val);
              }
            }}
            className="w-16 bg-gray-800 border border-gray-600 rounded-md text-center font-mono text-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>
    </motion.div>
  );
};