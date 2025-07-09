// src/components/MashupVisualizer/types.ts

import { PanInfo } from "framer-motion";


export type ParamKey = "temperature" | "count"; // Stricter for now

export interface WheelConfig {
  thickness: number;
  defaultGradient: string[];
  panGradient: string[];
  defaultShadow: string;
  panShadow: string;
  // Optional properties for specific dials
  max?: number;
  tickColor?: string;
  inactiveTickColor?: string;
}

export interface ControlWheelProps {
    activeParam: ParamKey;
    config: WheelConfig;
    totalSize: number;
    wheelInnerRadius: number;
    wheelRotation: number;
    isPanningWheel: boolean;
    onPan: (e: any, info: PanInfo) => void;
    onPanStart: (e: any, info: PanInfo) => void;
    onPanEnd: () => void;
    wheelRef: React.RefObject<HTMLDivElement>;
    // Prop to pass the current count for tick marks
}