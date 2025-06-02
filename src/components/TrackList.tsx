import React, { useRef, useState, useEffect } from 'react';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import Track from './Track';
import Timeline from './Timeline';
import { Button } from '@/components/ui/button';
import { Plus, ZoomIn, ZoomOut, Upload, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { createAudioBufferFromFile } from '../utils/audio-utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import EQEffect from './EQEffect';
import CompressorEffect from './CompressorEffect';
import ReverbEffect from './ReverbEffect';

// Helper function to convert hex color to rgba (copied from Track.tsx)
function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type TrackListProps = {
  className?: string;
};

const TrackList: React.FC<TrackListProps> = ({ className }) => {
  const { 
    project, 
    addTrack, 
    selectTrack, 
    clearClipSelection, 
    setZoom,
    addClip,
    selectedTrackId,
    showEffectsPanel,
    addEffect,
    updateEffectParams,
    removeEffect,
    toggleEffectsPanel,
  } = useAudioEngine();
  
  const [containerWidth, setContainerWidth] = useState(1000);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pixelsPerSecond = 100 * project.zoom;
  
  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
        setContainerHeight(window.innerHeight - 200); // Adjust based on header and transport controls height
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Synchronize horizontal scrolling between timeline and tracks
  useEffect(() => {
    const timelineElement = timelineContainerRef.current;
    const tracksElement = tracksContainerRef.current;
    
    if (!timelineElement || !tracksElement) return;
    
    const handleTracksScroll = () => {
      if (timelineElement && tracksElement) {
        timelineElement.scrollLeft = tracksElement.scrollLeft;
      }
    };
    
    tracksElement.addEventListener('scroll', handleTracksScroll);
    
    return () => {
      tracksElement.removeEventListener('scroll', handleTracksScroll);
    };
  }, []);
  
  const handleBackgroundClick = () => {
    selectTrack(null);
    clearClipSelection();
  };
  
  const handleZoomIn = () => {
    setZoom(project.zoom * 1.2);
  };
  
  const handleZoomOut = () => {
    setZoom(project.zoom / 1.2);
  };
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Get the dropped files
    const files = e.dataTransfer.files;
    
    if (!files || files.length === 0) {
      return;
    }
    
    // If no track is selected, use the last track or create a new one
    let targetTrackId = selectedTrackId;
    
    if (!targetTrackId) {
      if (project.tracks.length > 0) {
        // Use the last track if available
        targetTrackId = project.tracks[project.tracks.length - 1].id;
      } else {
        // Create a new track if none exist
        addTrack();
        // We need to wait for the state to update, so we'll exit this function
        toast({
          title: "New track created",
          description: "Drop your audio file again on the new track.",
        });
        return;
      }
    }
    
    // Process the dropped files (only audio files)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Invalid file",
          description: `${file.name} is not an audio file.`,
          variant: "destructive",
        });
        continue;
      }
      
      try {
        toast({
          title: "Processing audio",
          description: `Processing ${file.name}...`,
        });
        
        const audioBuffer = await createAudioBufferFromFile(file);
        
        await addClip(
          targetTrackId,
          audioBuffer,
          project.currentTime,
          file.name
        );
        
        toast({
          title: "Import successful",
          description: `Added "${file.name}" to track`,
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import failed",
          description: "Failed to import audio file. Please try a different file.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Calculate content width for scrolling
  const totalWidth = Math.max(containerWidth, project.duration * pixelsPerSecond + 200);
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Zoom controls */}
      <div className="flex items-center justify-between border-b border-daw-panel bg-[#1A1F2C] py-1 px-3">
        <div>
          {/* Button removed from here */}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleZoomOut}
            className="text-daw-control"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-xs text-white opacity-70">
            {project.zoom.toFixed(1)}x
          </span>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleZoomIn}
            className="text-daw-control"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Main content with fixed track controls and scrollable content */}
      <div 
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
      >
        {/* Fixed track controls column */}
        <div className="w-[180px] flex-shrink-0 border-r border-daw-panel overflow-y-auto">
          {/* Track header space */}
          <div className="h-[30px] border-b border-daw-panel bg-daw-bg flex items-center p-2">
            {/* Add Track Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={addTrack}
              className="flex items-center text-xs text-daw-control w-full justify-start hover:text-white hover:bg-transparent focus:text-white focus:outline-none"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Track
            </Button>
          </div>
          
          {/* Track controls */}
          {project.tracks.map((track) => (
            <Track.Controls
              key={track.id}
              track={track}
              height={100}
            />
          ))}
        </div>
        
        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline - synchronized with track scrolling */}
          <div 
            className="sticky top-0 z-10 bg-daw-bg overflow-hidden"
            ref={timelineContainerRef}
            style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div style={{ width: totalWidth }}>
              <Timeline 
                pixelsPerSecond={pixelsPerSecond} 
                width={totalWidth}
                height={30}
              />
            </div>
          </div>
          
          {/* Scrollable tracks area */}
          <div 
            className="relative flex-1 overflow-hidden"
          >
            {/* Horizontal scrolling container */}
            <div 
              ref={tracksContainerRef}
              className="h-full overflow-auto"
            >
              <div style={{ width: totalWidth, position: 'relative' }}>
                {/* Playhead - spans full content height */}
                <div 
                  className={cn(
                    'absolute top-0 h-full w-[2px] bg-daw-playhead z-10',
                    project.isPlaying ? 'animate-pulse' : ''
                  )}
                  style={{ 
                    left: `${project.currentTime * pixelsPerSecond}px`,
                    height: project.tracks.length ? `${project.tracks.length * 100}px` : '100px'
                  }}
                />
                
                {/* Tracks content */}
                <div onClick={handleBackgroundClick}>
                  {project.tracks.length === 0 ? (
                    <div className="flex h-40 items-center justify-center bg-daw-bg">
                      <div className="text-center text-daw-control">
                        <p className="mb-2">No tracks yet</p>
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addTrack();
                          }}
                        >
                          Add Track
                        </Button>
                      </div>
                    </div>
                  ) : (
                    project.tracks.map((track) => (
                      <Track.Content
                        key={track.id}
                        track={track}
                        pixelsPerSecond={pixelsPerSecond}
                        height={100}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Fixed drop area at bottom */}
          <div
            ref={dropAreaRef}
            className={cn(
              "mt-4 mx-4 mb-4 border-2 border-dashed p-6 transition-colors rounded-md flex flex-col items-center justify-center",
              isDragging 
                ? "border-primary bg-primary/10" 
                : "border-daw-control/30 bg-daw-bg hover:border-daw-control/60"
            )}
            style={{ height: '100px' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mb-2 text-daw-control/70" />
            <p className="text-center text-sm text-daw-control">
              Drop audio files here to import
            </p>
          </div>
        </div>
      </div>
      
      {/* Effects Panel at the bottom */}
      {showEffectsPanel && selectedTrackId && (
        <div className="flex flex-col bg-daw-panel p-3 border-t border-daw-panel flex-shrink-0" style={{ minHeight: '250px' }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-daw-control/50 pb-2 mb-2 mx-[-0.75rem] px-3">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-daw-control hover:text-white"
              onClick={toggleEffectsPanel}
            >
              <X className="h-4 w-4" />
            </Button>
            {/* Track Name */}
            <div className="text-lg font-bold text-white flex-1 text-center">
              {project.tracks.find(t => t.id === selectedTrackId)?.name}
            </div>
             {/* Placeholder for alignment */}
             <div className="h-5 w-5"></div>
          </div>

          <div className="flex-1 flex gap-4 flex-nowrap overflow-x-auto pb-2">
            {/* Add Effect Button */}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-shrink-0 h-[165px] bg-transparent text-daw-control hover:bg-opacity-30"
                  style={{
                    // Apply hover background color dynamically
                    transition: 'background-color 0.2s ease-in-out',
                    backgroundColor: 'transparent',
                    '--hover-bg-color': selectedTrackId 
                       ? hexToRgba(project.tracks.find(t => t.id === selectedTrackId)?.color || '#a78bfa', 0.3) 
                       : 'transparent',
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.backgroundColor = target.style.getPropertyValue('--hover-bg-color');
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.backgroundColor = 'transparent';
                  }}
                >
                  Add Effect
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {/* Опция добавления эквалайзера */}
                <ContextMenuItem onClick={() => {
                   if (selectedTrackId) {
                     addEffect(selectedTrackId, 'eq', { low: 0, mid: 0, high: 0 });
                   }
                }}>
                  EQ (Эквалайзер)
                </ContextMenuItem>
                {/* Опция добавления компрессора */}
                <ContextMenuItem onClick={() => {
                   if (selectedTrackId) {
                     addEffect(selectedTrackId, 'compressor', { peakReduction: 0, gain: 0 });
                   }
                }}>
                  LA-2A Compressor
                </ContextMenuItem>
                {/* Опция добавления ревербератора */}
                <ContextMenuItem onClick={() => {
                   if (selectedTrackId) {
                     addEffect(selectedTrackId, 'reverb', { mix: 50, size: 50 });
                   }
                }}>
                  Reverb (Ревербератор)
                </ContextMenuItem>
                {/* Здесь будут другие типы эффектов в будущем */}
              </ContextMenuContent>
            </ContextMenu>

            {/* Render effects for the selected track */}
            {selectedTrackId && project.tracks.find(t => t.id === selectedTrackId)?.effects.map(effect => {
              if (effect.type === 'eq') {
                return (
                  <EQEffect 
                    key={effect.id}
                    effect={effect} 
                    onParamsChange={(params) => updateEffectParams(selectedTrackId!, effect.id, params)}
                    onRemove={() => removeEffect(selectedTrackId!, effect.id)}
                  />
                );
              }
              if (effect.type === 'compressor') {
                return (
                  <CompressorEffect 
                    key={effect.id}
                    effect={effect} 
                    onParamsChange={(params) => updateEffectParams(selectedTrackId!, effect.id, params)}
                    onRemove={() => removeEffect(selectedTrackId!, effect.id)}
                  />
                );
              }
              if (effect.type === 'reverb') {
                return (
                  <ReverbEffect 
                    key={effect.id}
                    effect={effect} 
                    onParamsChange={(params) => updateEffectParams(selectedTrackId!, effect.id, params)}
                    onRemove={() => removeEffect(selectedTrackId!, effect.id)}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackList;
