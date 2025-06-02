import React, { useRef, useState } from 'react';
import { AudioClip as AudioClipType } from '../contexts/AudioEngineContext';
import Waveform from './Waveform';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import { cn } from '../lib/utils';
import { getLightColor } from '../utils/color-utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash2, Scissors } from 'lucide-react';

type AudioClipProps = {
  clip: AudioClipType;
  pixelsPerSecond: number;
  color?: string;
};

const AudioClip: React.FC<AudioClipProps> = ({ clip, pixelsPerSecond, color }) => {
  const { 
    selectClip, 
    selectedClipIds, 
    project, 
    moveClip, 
    trimClip,
    removeClip,
    splitClip
  } = useAudioEngine();
  
  const isSelected = selectedClipIds.includes(clip.id);
  const clipRef = useRef<HTMLDivElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [startX, setStartX] = useState(0);
  const [originalStartTime, setOriginalStartTime] = useState(0);
  const [originalDuration, setOriginalDuration] = useState(0);
  
  const clipWidth = clip.duration * pixelsPerSecond;
  const clipLeft = clip.startTime * pixelsPerSecond;
  
  const clipColor = color || '#a78bfa';
  const waveformColor = getLightColor(clipColor);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeClip(clip.id);
  };
  
  const handleSplit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project && project.currentTime) {
      await splitClip(clip.id);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't handle if the target is a resize handle
    if (
      (e.target as HTMLElement).classList.contains('resize-handle-left') ||
      (e.target as HTMLElement).classList.contains('resize-handle-right')
    ) {
      return;
    }
    
    // Select the clip (and add to selection if shift key is pressed)
    selectClip(clip.id, e.shiftKey);
    
    // Start dragging
    setIsDragging(true);
    setStartX(e.clientX);
    setOriginalStartTime(clip.startTime);
    
    // Add event listeners for mouse move and up events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    e.stopPropagation();
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging && !isResizingLeft && !isResizingRight) return;
    
    const deltaX = e.clientX - startX;
    const deltaTime = deltaX / pixelsPerSecond;
    
    if (isDragging) {
      // Calculate new position, but ensure it doesn't go negative
      const newStartTime = Math.max(0, originalStartTime + deltaTime);
      
      // Update clip position (but don't actually move it until mouse up)
      if (clipRef.current) {
        clipRef.current.style.left = `${newStartTime * pixelsPerSecond}px`;
      }
    } else if (isResizingLeft) {
      // Calculate new start time and duration
      const maxDeltaTime = Math.min(originalDuration - 0.1, deltaTime); // Ensure clip doesn't get too short
      const newStartTime = Math.max(0, originalStartTime + maxDeltaTime);
      const newDuration = originalDuration - (newStartTime - originalStartTime);
      
      // Update clip visually
      if (clipRef.current) {
        clipRef.current.style.left = `${newStartTime * pixelsPerSecond}px`;
        clipRef.current.style.width = `${newDuration * pixelsPerSecond}px`;
      }
    } else if (isResizingRight) {
      // Calculate new duration
      const newDuration = Math.max(0.1, originalDuration + deltaTime); // Ensure clip doesn't get too short
      
      // Update clip visually
      if (clipRef.current) {
        clipRef.current.style.width = `${newDuration * pixelsPerSecond}px`;
      }
    }
  };
  
  const handleMouseUp = (e: MouseEvent) => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    if (isDragging) {
      setIsDragging(false);
      
      // Calculate final position
      const deltaX = e.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = Math.max(0, originalStartTime + deltaTime);
      
      // Find the target track based on mouse position
      const tracks = document.querySelectorAll('[data-track-id]');
      let targetTrackId = clip.trackId;
      
      for (const track of tracks) {
        const rect = track.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          targetTrackId = track.getAttribute('data-track-id') || clip.trackId;
          break;
        }
      }
      
      // Update clip position in the state
      moveClip(clip.id, targetTrackId, newStartTime);
    } else if (isResizingLeft) {
      setIsResizingLeft(false);
      
      // Calculate final dimensions
      const deltaX = e.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const maxDeltaTime = Math.min(originalDuration - 0.1, deltaTime);
      const newStartTime = Math.max(0, originalStartTime + maxDeltaTime);
      const newDuration = originalDuration - (newStartTime - originalStartTime);
      
      // Apply the trim
      const trimStart = newStartTime - originalStartTime;
      const trimEnd = 0; // No change to the right edge
      trimClip(clip.id, trimStart, trimEnd);
    } else if (isResizingRight) {
      setIsResizingRight(false);
      
      // Calculate final dimensions
      const deltaX = e.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newDuration = Math.max(0.1, originalDuration + deltaTime);
      
      // Apply the trim
      const trimStart = 0; // No change to the left edge
      const trimEnd = originalDuration - newDuration;
      trimClip(clip.id, trimStart, trimEnd);
    }
  };
  
  const handleResizeLeftMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingLeft(true);
    setStartX(e.clientX);
    setOriginalStartTime(clip.startTime);
    setOriginalDuration(clip.duration);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const handleResizeRightMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingRight(true);
    setStartX(e.clientX);
    setOriginalDuration(clip.duration);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={clipRef}
          className={cn(
            'absolute h-full cursor-move select-none rounded border',
            isSelected ? 'ring-inset ring-2 ring-white' : '',
            isDragging ? 'opacity-50' : ''
          )}
          style={{
            left: `${clipLeft}px`,
            width: `${clipWidth}px`,
            background: clipColor,
            borderColor: clipColor,
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex h-full flex-col p-1.5 relative">
            <div className="flex-1 min-h-0 pt-3" style={{height: 'calc(100% - 24px)'}}>
              <Waveform 
                data={clip.waveform} 
                height={clipRef.current ? clipRef.current.offsetHeight - 24 : 38} 
                color={waveformColor}
                scale={pixelsPerSecond / 50}
              />
            </div>
            <div className="text-xs text-white truncate mt-0.5">
              {clip.name}
            </div>
          </div>
          
      {/* Resize handles */}
      <div
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize resize-handle-left bg-white bg-opacity-20 hover:bg-opacity-40"
        onMouseDown={handleResizeLeftMouseDown}
      />
      <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize resize-handle-right bg-white bg-opacity-20 hover:bg-opacity-40"
        onMouseDown={handleResizeRightMouseDown}
        />
      </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleSplit}>
          <Scissors className="mr-2 h-4 w-4" />
          Split (Нарезать)
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Clip
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default AudioClip;
