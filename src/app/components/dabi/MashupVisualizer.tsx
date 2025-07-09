// MashupVisualizer.tsx
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, animate } from 'framer-motion';
import { Track, MashupData } from '@/types';
import { FaThermometerHalf, FaSpinner, FaCaretDown  } from 'react-icons/fa';
import { PiMusicNotesPlusFill } from 'react-icons/pi';
import { ParamKey, WheelConfig, ControlWheelProps } from './MashupVisualizer/types';
import { wheelVariants } from './MashupVisualizer/variants';
import { MashupHUD } from './MashupVisualizer/MashupHUD';

interface MashupVisualizerProps {
  tracks: Track[];
  onUpdateTracks: (updatedTracks: Track[]) => void;
  onClose: () => void;
  updateDAWState?: (mashupData: MashupData) => void;
}

const ControlWheel: React.FC<ControlWheelProps> = ({
    activeParam,
    config,
    totalSize,
    wheelInnerRadius,
    wheelRotation,
    isPanningWheel,
    onPan,
    onPanStart,
    onPanEnd,
    wheelRef,
}) => {
    // Memoize the style object to prevent re-computation on every render
    const style = useMemo<React.CSSProperties>(() => {
        const gradient = isPanningWheel ? config.panGradient : config.defaultGradient;
        const mask = `radial-gradient(circle at center, transparent 0, transparent ${wheelInnerRadius}px, white ${wheelInnerRadius}px)`;
        return {
            width: totalSize,
            height: totalSize,
            maskImage: mask,
            WebkitMaskImage: mask,
            background: `conic-gradient(from ${wheelRotation}deg, ${gradient.join(", ")})`,
        };
    }, [totalSize, wheelInnerRadius, wheelRotation, isPanningWheel, config]);

    const currentShadow = isPanningWheel ? config.panShadow : config.defaultShadow;

    return (
        <motion.div
            key={activeParam}
            ref={wheelRef}
            style={style}
            className="absolute top-0 left-0 rounded-full z-40 cursor-grab active:cursor-grabbing"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={wheelVariants}
            custom={{ boxShadow: currentShadow }}
            onPan={onPan}
            onPanStart={onPanStart}
            onPanEnd={onPanEnd}
        >
            {/* Conditionally render tick marks only for the 'count' dial */}
            {activeParam === 'count' && config.max !== undefined && (
              <motion.div
                className="absolute inset-0" // Make it cover the parent
                animate={{ rotate: wheelRotation }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }} // Ensures smooth, responsive rotation
              >
                {Array.from({ length: config.max + 1 }).map((_, i) => {
                    const anglePerTick = 360 / (config.max! + 1);
                    const angle = i * anglePerTick;
                    return (
                        <div key={`tick-${i}`} className="absolute" style={{
                            top: '50%', left: '50%',
                            // Make the '0' tick visually distinct
                            width: i === 0 ? '4px' : '2px',
                            height: i === 0 ? config.thickness : config.thickness - 10,
                            transform: `rotate(${angle}deg) translateY(-${wheelInnerRadius + (i === 0 ? config.thickness / 2 : (config.thickness - 10) / 2)}px)`,
                            transformOrigin: 'center center',
                            backgroundColor: i === 0 ? 'white' : config.tickColor,
                        }} />
                    );
                })}
            </motion.div>
            )}
        </motion.div>
    );
};


const MashupVisualizer: React.FC<MashupVisualizerProps> = ({ tracks, onUpdateTracks, onClose, updateDAWState }) => {
  // --- Existing State ---
  const [localTracks, setLocalTracks] = useState<Track[]>(tracks);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // --- New State for Mashup Parameters & UI ---
  const [isMashupOptionsVisible, setIsMashupOptionsVisible] = useState(false);
  const [activeParam, setActiveParam] = useState<'temperature' | 'count' | null>(null);
  const [temperature, setTemperature] = useState(0.1); // Value from 0.0 to 1.0
  const [count, setCount] = useState(0); // numSuggestions
  const [isLoadingMashup, setIsLoadingMashup] = useState(false);
  const [isPanningWheel, setIsPanningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  // --- Existing Dimensions ---
  const containerSize = 500;
  const centerSize = 120;
  const centerRadius = centerSize / 2;
  const bubbleSize = 70;
  const containerCenter = { x: containerSize / 2, y: containerSize / 2 };
  const outerRadius = 180;
  const tempWheelThickness = 20;
  const countWheelThickness = 40;
  const wheelInnerRadius = containerSize / 2;

  const MAX_COUNT = 5;

  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef(0);
  const panStartAngle = useRef(0)
  const panStartWheelRotation = useRef(0);

  const activeParamRef = useRef(activeParam);
  useEffect(() => {
    activeParamRef.current = activeParam;
  }, [activeParam]);


  const isPanningWheelRef = useRef(isPanningWheel);
  useEffect(() => {
    isPanningWheelRef.current = isPanningWheel;
  }, [isPanningWheel]);



  // --- Existing Effects & Handlers (collapsed for brevity) ---
  useEffect(() => {
    // ... (no changes here, logic is sound)
    setPositions(prev => {
      const newPositions = { ...prev };
      const nonAnchored = localTracks.filter(track => !track.anchor).sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      nonAnchored.forEach((track, index) => {
        const currentPos = newPositions[track.id!];
        const isAtCenter = currentPos && currentPos.x === containerCenter.x - bubbleSize / 2 && currentPos.y === containerCenter.y - bubbleSize / 2;
        if (!currentPos || isAtCenter) {
          const angle = (2 * Math.PI * index) / (nonAnchored.length || 1);
          newPositions[track.id!] = {
            x: containerCenter.x + outerRadius * Math.cos(angle) - bubbleSize / 2,
            y: containerCenter.y + outerRadius * Math.sin(angle) - bubbleSize / 2
          };
        }
      });
      localTracks.filter(track => track.anchor).forEach(track => {
        newPositions[track.id!] = {
          x: containerCenter.x - bubbleSize / 2,
          y: containerCenter.y - bubbleSize / 2
        };
      });
      return newPositions;
    });
  }, [localTracks, containerCenter.x, containerCenter.y, outerRadius, bubbleSize]);

  const handleDragEnd = (e: any, info: any, trackId: string) => {
    // ... (no changes here, logic is sound)
    if (!containerRef.current || !centerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const dropX = info.point.x - containerRect.left;
    const dropY = info.point.y - containerRect.top;
    const centerRect = centerRef.current.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2 - containerRect.left;
    const centerY = centerRect.top + centerRect.height / 2 - containerRect.top;
    const distance = Math.sqrt((dropX - centerX) ** 2 + (dropY - centerY) ** 2);
    const isAnchor = distance <= centerRadius;
    const previouslyAnchored = localTracks.find(track => track.anchor && track.id !== trackId);
    setLocalTracks(prev => prev.map(track => {
      if (track.id === trackId) return { ...track, anchor: isAnchor };
      else if (isAnchor && track.anchor) return { ...track, anchor: false };
      return track;
    }));
    setPositions(prev => ({
      ...prev,
      [trackId]: isAnchor
        ? { x: containerCenter.x - bubbleSize / 2, y: containerCenter.y - bubbleSize / 2 }
        : { x: dropX - bubbleSize / 2, y: dropY - bubbleSize / 2 }
    }));
    if (previouslyAnchored) {
      const nonAnchored = localTracks.filter(track => !track.anchor || track.id === previouslyAnchored.id).sort((a, b) => (a.id || "").localeCompare(b.id || ""));
      const index = nonAnchored.findIndex(track => track.id === previouslyAnchored.id);
      const angle = (2 * Math.PI * index) / (nonAnchored.length || 1);
      setPositions(prev => ({ ...prev, [previouslyAnchored.id!]: { x: containerCenter.x + outerRadius * Math.cos(angle) - bubbleSize / 2, y: containerCenter.y + outerRadius * Math.sin(angle) - bubbleSize / 2 } }));
    }
  };

  const handleMashup = async (mode: "mashup" | "mashup-plus") => {
    setIsLoadingMashup(true);
    setDropdownOpen(false); 
    try {
        console.log('Sending tracks with params:', { localTracks, temperature, count });
        const response = await fetch('/api/mashup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tracks: localTracks, 
                mode, 
                numSuggestions: count,
                temperature: temperature
            }),
        });

        if (!response.ok) throw new Error(`Failed to process mashup: ${await response.text()}`);
        const mashupResult = await response.json();
        console.log("Received Mashup Result:", mashupResult);
        if (updateDAWState) updateDAWState(mashupResult);

    } catch (error) {
        console.error('Error creating mashup:', error);
    } finally {
        setIsLoadingMashup(false);
        // Reset UI states after mashup is done
        setActiveParam(null);
        setIsMashupOptionsVisible(false);
    }
  };

  const getContainerGradient = (temp: number): string => {
    // Define start (cool) and end (warm) colors for the gradient
    const coolColor1 = { h: 220, s: 15, l: 25 }; // Muted Blue/Grey (from-gray-800)
    const coolColor2 = { h: 243, s: 56, l: 20 }; // Dark Indigo (to-indigo-900)

    const warmColor1 = { h: 15, s: 60, l: 25 }; // Deep Red/Orange
    const warmColor2 = { h: 30, s: 70, l: 40 }; // Bright Orange

    // Interpolate HSL values based on temperature (temp is 0.0 to 1.0)
    const h1 = coolColor1.h + (warmColor1.h - coolColor1.h) * temp;
    const s1 = coolColor1.s + (warmColor1.s - coolColor1.s) * temp;
    const l1 = coolColor1.l + (warmColor1.l - coolColor1.l) * temp;

    const h2 = coolColor2.h - (coolColor2.h - warmColor2.h) * temp; // Hue goes down for this one
    const s2 = coolColor2.s + (warmColor2.s - coolColor2.s) * temp;
    const l2 = coolColor2.l + (warmColor2.l - coolColor2.l) * temp;

    const color1 = `hsl(${h1}, ${s1}%, ${l1}%)`;
    const color2 = `hsl(${h2}, ${s2}%, ${l2}%)`;
    
    return `linear-gradient(to right, ${color1}, ${color2})`;
  };

  const wheelConfigs = useMemo<Record<ParamKey, Omit<WheelConfig, 'handler'>>>(() => ({
      temperature: {
          thickness: 20,
          defaultGradient: ["#9ca3af", "#6b7280", "#4b5563", "#6b7280", "#9ca3af"],
          panGradient: ["#d1d5db", "#9ca3af", "#6b7280", "#9ca3af", "#d1d5db"],
          defaultShadow: "0 0 10px rgba(0,0,0,0.3)",
          panShadow: "0 0 20px rgba(156,163,175,0.5), 0 0 40px rgba(156,163,175,0.3)",
      },
      count: {
          thickness: 40,
          defaultGradient: ["#9ca3af", "#6b7280", "#4b5563", "#6b7280", "#9ca3af"],
          panGradient: ["#9ca3af", "#6b7280", "#4b5563", "#6b7280", "#9ca3af"], // removed highlighted on pan color for count: ["#d1d5db", "#9ca3af", "#6b7280", "#9ca3af", "#d1d5db"],
          defaultShadow: "0 0 12px rgba(126, 34, 206, 0.4)",
          panShadow: "0 0 25px rgba(168, 85, 247, 0.6), 0 0 40px rgba(168, 85, 247, 0.4)",
          max: 5,
          tickColor: "#e9d5ff", // Light purple
          inactiveTickColor: "#581c87", // Dark purple
      },
  }), []);

  const activeWheelThickness = (activeParam ? wheelConfigs[activeParam].thickness : 20);
  const totalSize = containerSize + activeWheelThickness * 2;

  const handlePanStart = useCallback((e: MouseEvent | TouchEvent, info: PanInfo) => {
        if (!wheelRef.current) return;
        setIsPanningWheel(true);
        
        // Stop any ongoing animation (like a previous snap)
        animate(wheelRotation, wheelRotation, { onUpdate: v => setWheelRotation(v) }).stop();

        const { x, y } = wheelRef.current.getBoundingClientRect();
        const wheelCenter = { x: x + totalSize / 2, y: y + totalSize / 2 };
        
        const startAngle = Math.atan2(info.point.y - wheelCenter.y, info.point.x - wheelCenter.x);
        
        // Use refs and direct state access to set initial pan values.
        panStartAngle.current = startAngle;
        lastAngle.current = startAngle;
        panStartWheelRotation.current = wheelRotation;
    }, [totalSize, wheelRotation]);


    
  const handlePan = useCallback((e: MouseEvent | TouchEvent, info: PanInfo) => {
    if (!wheelRef.current) return;
    const { x, y } = wheelRef.current.getBoundingClientRect();
    const wheelCenter = { x: x + totalSize / 2, y: y + totalSize / 2 };
    const currentAngle = Math.atan2(info.point.y - wheelCenter.y, info.point.x - wheelCenter.x);

    // Use the ref to get the CURRENT active parameter
    if (activeParamRef.current === 'count') {
        let angleDelta = currentAngle - panStartAngle.current;
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
        const newRotation = panStartWheelRotation.current + (angleDelta * 180 / Math.PI);
        setWheelRotation(newRotation);
    } else if (activeParamRef.current === 'temperature') {
        let angleDelta = currentAngle - lastAngle.current;
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
        setTemperature(prev => Math.max(0, Math.min(1, prev + (angleDelta * 0.2))));
        // Use a functional update for rotation to avoid dependency
        setWheelRotation(prev => prev + (angleDelta * (180 / Math.PI)));
        lastAngle.current = currentAngle;
    }
  }, [totalSize]); 

  const handlePanEnd = useCallback(() => {
    // Use the ref to get the CURRENT active parameter
    if (activeParamRef.current === 'count') {
        // Use a functional update to get the LATEST wheelRotation value
        setWheelRotation(currentRotation => {
            const anglePerTick = 360 / (MAX_COUNT + 1);
            const closestTickIndex = Math.round(-currentRotation / anglePerTick);
            const targetRotation = -closestTickIndex * anglePerTick;
            
            // Animate from the latest value to the target
            animate(currentRotation, targetRotation, {
                type: "spring", stiffness: 800, damping: 40,
                onUpdate: latest => setWheelRotation(latest),
            });
            
            // The return value for the setter is the immediate rotation before animation
            return currentRotation; 
        });
    }
    setIsPanningWheel(false);
  }, []); 


  const activeConfig = useMemo(() => {
    if (!activeParam) return null;    
    return {
      ...wheelConfigs[activeParam],
    };
  }, [activeParam, wheelConfigs]);
    
    // NEW: This useEffect derives the `count` from the `wheelRotation`.
    // This is the single source of truth, preventing feedback loops.
  useEffect(() => {
      if (activeParam === 'count') {
          const anglePerTick = 360 / (MAX_COUNT + 1);
          // Calculate which tick is currently at the top (12 o'clock)
          const currentTick = Math.round(-wheelRotation / anglePerTick);
          
          // Use modulo to handle wrapping around (e.g., from 5 back to 0)
          // The double modulo handles negative numbers correctly
          const newCount = (currentTick % (MAX_COUNT + 1) + (MAX_COUNT + 1)) % (MAX_COUNT + 1);

          if (newCount !== count) {
              setCount(newCount);
          }
      }
  }, [wheelRotation, activeParam, count]);


  useEffect(() => {
    // When panning starts, prevent text selection anywhere on the page
    // and set a global 'grabbing' cursor for better UX.
    if (isPanningWheel) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      // When panning stops, restore default browser behavior.
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    // A cleanup function is crucial in case the component unmounts
    // while a pan is active.
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isPanningWheel]);

  useEffect(() => {
    // This function will be called when the mouse is released anywhere on the page.
    const handleGlobalPointerUp = () => {
      // If our component thinks it's panning, we force it to stop.
      // This catches the edge case where onPanEnd doesn't fire.
      if (isPanningWheelRef.current) {
        handlePanEnd();
      }
    };

    // Add the global listener when the component mounts.
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp); // Also for touch devices

    // IMPORTANT: Clean up the listener when the component unmounts.
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [handlePanEnd]);
    

  useEffect(() => {
    console.log("Temperature: ", temperature);
  }
  , [temperature]);

  useEffect(() => {
    console.log("numSuggestions: ", count);
  }, [count]);

  useEffect(() => {
    console.log('isPanningWheel:', isPanningWheel);
  }, [isPanningWheel]);



  // --- NEW: Handler for the Mashup button click ---
  const onMashupButtonClick = () => {
    // If a parameter is being configured, the first click just closes the config UI
    if (activeParam) {
      setActiveParam(null);
      setIsMashupOptionsVisible(false);
      return;
    }
    // Otherwise, call the API
    handleMashup("mashup");
  };

  

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${isPanningWheel ? 'pointer-events-none' : ''}`} onClick={onClose} />
      
      <div
        className="relative"
        style={{ width: totalSize, height: totalSize }}
      >
        <AnimatePresence>
          {activeParam && activeConfig && (
              <ControlWheel
                  activeParam={activeParam}
                  config={activeConfig}
                  totalSize={totalSize}
                  wheelInnerRadius={wheelInnerRadius}
                  wheelRotation={wheelRotation}
                  isPanningWheel={isPanningWheel}
                  onPan={handlePan}
                  onPanStart={handlePanStart}
                  onPanEnd={handlePanEnd}
                  wheelRef={wheelRef}
              />
          )}
      </AnimatePresence>

        {/* MODIFIED: Container is now absolutely positioned inside the new wrapper */}
        <motion.div
          ref={containerRef}
          style={{
            width: containerSize,
            height: containerSize,
            top: activeWheelThickness,
            left: activeWheelThickness,
          }}
          className="absolute rounded-full shadow-2xl border border-indigo-500/30 z-10"
          animate={{ background: getContainerGradient(temperature) }}
          transition={{ duration: 0.5 }}
        >
          {/* All inner elements of the visualizer are now safe from the wheel overlay */}
          <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
          <div 
            className="absolute rounded-full border border-indigo-400/20"
            style={{
              width: outerRadius * 2 + 20,
              height: outerRadius * 2 + 20,
              top: containerCenter.y - outerRadius - 10,
              left: containerCenter.x - outerRadius - 10,
            }}
          ></div>
          
          <div
            ref={centerRef}
            style={{
              width: centerSize,
              height: centerSize,
              top: containerCenter.y - centerRadius,
              left: containerCenter.x - centerRadius,
            }}
            className="absolute bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center border-2 border-white/80 shadow-lg shadow-blue-500/50 z-30 pointer-events-auto"
          >
            <span className="text-white font-bold text-sm">ANCHOR</span>
          </div>
          
          <AnimatePresence>
            {localTracks.map(track => {
              const pos = positions[track.id!] || { x: 0, y: 0 };
              const albumImage = (track as any).album?.images?.[0]?.url || 'https://via.placeholder.com/70?text=No+Image';
              return (
                <motion.div
                  key={track.id}
                  drag
                  dragMomentum={false}
                  dragElastic={0}
                  onDragEnd={(e, info) => handleDragEnd(e, info, track.id!)}
                  initial={{ x: pos.x, y: pos.y, scale: 0 }}
                  animate={{ 
                    x: pos.x,
                    y: pos.y,
                    scale: 1,
                    transition: { type: "spring", stiffness: 1000, damping: 20 }
                  }}
                  exit={{ scale: 0 }}
                  whileDrag={{ scale: 1.1, zIndex: 50, transition: { duration: 0 } }}
                  style={{
                    width: bubbleSize,
                    height: bubbleSize,
                    backgroundImage: `url(${albumImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: track.anchor ? 35 : 20,
                  }}
                  className={`absolute rounded-full flex items-center justify-center cursor-pointer 
                            shadow-lg overflow-hidden transition-all duration-200 pointer-events-auto
                            ${track.anchor ? 'border-2 border-yellow-300 shadow-yellow-400/50' : 'border border-white/30'}`}
                >
                  <div className={`absolute inset-0 flex items-center justify-center 
                                ${track.anchor ? 'bg-yellow-500/30' : 'bg-black/30 hover:bg-black/20'}`}>
                    <span className="text-xs text-white font-bold drop-shadow-md">
                      {track.name.slice(0, 8)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {/* Close Button (no changes) */}
      <button /* ... */ >X</button>
      
      {/* --- REWORKED: Mix Dropdown Button --- */}
      <div className="absolute top-16 right-5">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-2 rounded-md font-medium shadow-lg hover:shadow-purple-500/30 transition-all"
        >
          Mix ▼
        </button>
        
        {/* Dropdown Menu - NOW WITH NEW INTERACTIVE BUTTONS */}
        <AnimatePresence>
        {dropdownOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-gray-900/80 backdrop-blur-sm rounded-md shadow-xl z-50 overflow-hidden border border-white/20"
          >
            {/* --- NEW: Interactive Mashup Button --- */}
            <motion.div
              className="relative w-full h-10 overflow-hidden" // Parent must hide overflow
              onHoverStart={() => setIsMashupOptionsVisible(true)}
              onHoverEnd={() => {
                // Don't hide options if a parameter is being actively configured
                if (activeParam === null) {
                  setIsMashupOptionsVisible(false);
                }
              }}
            >
              {/* Sliding Text and Background */}
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-gray-800"
                animate={{ x: isMashupOptionsVisible ? '-80px' : '0px' }} // 80px is width of 2 icon buttons
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={onMashupButtonClick}
              >
                <button className="w-full h-full text-center text-white font-semibold flex items-center justify-center">
                  {isLoadingMashup ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    "Mashup"
                  )}
                </button>
              </motion.div>

              {/* Revealed Parameter Buttons */}
              <motion.div
                className="absolute top-0 right-0 h-full flex items-center"
                initial={{ x: '100%' }}
                animate={{ x: isMashupOptionsVisible ? '0%' : '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                {/* Temperature Button */}
                <motion.button
                  className={`w-10 h-10 flex items-center justify-center transition-colors ${
                    activeParam === 'temperature' ? 'bg-orange-600' : 'bg-cyan-500/50'
                  }`}
                  onClick={() => setActiveParam(p => p === 'temperature' ? null : 'temperature')}
                  whileHover={{ rotate: 15, scale: 1.1 }}
                >
                  <FaThermometerHalf className={`transition-colors ${activeParam === 'temperature' ? 'text-cyan-200' : 'text-white'}`} />
                </motion.button>
                {/* Count Button */}
                <motion.button
                  className={`w-10 h-10 flex items-center justify-center transition-colors ${
                    activeParam === 'count' ? 'bg-purple-500/50' : 'bg-slate-500'
                  }`}
                  onClick={() => {
                    // TODO: Implement UI for count adjustment if needed
                    setActiveParam(p => p === 'count' ? null : 'count');
                  }}
                  whileHover={{ rotate: 15, scale: 1.1 }}
                >
                  <PiMusicNotesPlusFill className={`transition-colors ${activeParam === 'count' ? 'text-purple-200' : 'text-white'}`} />
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Lyrical Button (can be upgraded similarly later) */}
            <button 
              className="w-full h-10 px-4 py-2 text-center text-white hover:bg-gray-700 transition-colors"
              onClick={() => {
                handleMashup("mashup-plus");
              }}
            >
               Lyrical
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MashupVisualizer;