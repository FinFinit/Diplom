import React, { useRef } from 'react';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import { formatTimeNoMs } from '../utils/audio-utils';

type TimelineProps = {
  pixelsPerSecond: number;
  width: number;
  height?: number;
};

const Timeline: React.FC<TimelineProps> = ({ 
  pixelsPerSecond, 
  width, 
  height = 30 
}) => {
  const { project, seekTo } = useAudioEngine();
  const { duration } = project;
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = clickX / pixelsPerSecond;
    
    seekTo(clickTime);
  };
  
  // Generate time markers
  const markers = [];
  let interval = 1; // Default 1 second
  
  // Adjust interval based on zoom level
  if (pixelsPerSecond < 20) interval = 10;
  else if (pixelsPerSecond < 50) interval = 5;
  else if (pixelsPerSecond < 100) interval = 2;
  
  for (let i = 0; i <= Math.max(duration, 60); i += interval) {
    const position = i * pixelsPerSecond;
    
    if (position > width) break;
    
    markers.push(
      <div 
        key={i} 
        className="absolute top-0 flex flex-col items-center"
        style={{ left: `${position}px` }}
      >
        <div className="h-3 w-[1px] bg-daw-control"></div>
        <div className="mt-1 text-xs text-daw-control">
          {formatTimeNoMs(i)}
        </div>
      </div>
    );
  }
  
  // Add intermediate markers
  if (pixelsPerSecond >= 50) {
    const subMarkers = [];
    const subInterval = interval / 4;
    
    for (let i = subInterval; i <= Math.max(duration, 60); i += subInterval) {
      if (i % interval === 0) continue; // Skip main markers
      
      const position = i * pixelsPerSecond;
      if (position > width) break;
      
      subMarkers.push(
        <div 
          key={`sub-${i}`} 
          className="absolute top-0 h-2 w-[1px] bg-daw-control opacity-50"
          style={{ left: `${position}px` }}
        />
      );
    }
    
    markers.push(...subMarkers);
  }
  
  return (
    <div 
      ref={containerRef}
      className="relative bg-daw-bg border-b border-daw-panel cursor-pointer select-none"
      style={{ height: `${height}px`, width: `${width}px` }}
      onClick={handleTimelineClick}
    >
      {markers}
    </div>
  );
};

export default Timeline;
