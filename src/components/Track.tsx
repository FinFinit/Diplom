import React from 'react';
import { Track as TrackType } from '../contexts/AudioEngineContext';
import AudioClip from './AudioClip';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import { cn } from '../lib/utils';
import { Volume2, Mic, Trash2, VolumeX, Palette, SlidersHorizontal } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

type TrackControlsProps = {
  track: TrackType;
  height?: number;
};

const TrackControls: React.FC<TrackControlsProps> = ({ 
  track, 
  height = 100
}) => {
  const { 
    selectedTrackId, 
    selectTrack,
    updateTrackName,
    updateTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
    startRecording,
    isRecording,
    removeTrack,
    updateTrackColor,
    toggleEffectsPanel
  } = useAudioEngine();
  
  const isSelected = selectedTrackId === track.id;
  
  const handleTrackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectTrack(track.id);
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTrackName(track.id, e.target.value);
  };
  
  const handleVolumeChange = (value: number[]) => {
    updateTrackVolume(track.id, value[0]);
  };
  
  const handleMuteToggle = () => {
    toggleTrackMute(track.id);
  };
  
  const handleSoloToggle = () => {
    toggleTrackSolo(track.id);
  };
  
  const handleRecordClick = async () => {
    if (isSelected && !isRecording) {
      await startRecording();
    } else {
      selectTrack(track.id);
    }
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeTrack(track.id);
  };
  
  const [showPalette, setShowPalette] = React.useState(false);

  const COLORS = [
    '#a78bfa', // violet
    '#f87171', // red
    '#fbbf24', // yellow
    '#34d399', // green
    '#60a5fa', // blue
    '#f472b6', // pink
    '#facc15', // gold
    '#6ee7b7', // teal
    '#818cf8', // indigo
  ];
  const handleColorChange = (color: string) => {
    updateTrackColor(track.id, color);
    setShowPalette(false);
  };
  
  return (
    <div 
      className={cn(
        'flex flex-col border-b border-daw-panel p-2',
        isSelected ? 'bg-daw-track' : 'bg-daw-bg'
      )} 
      style={{ height: `${height}px` }}
      onClick={handleTrackClick}
    >
      <div className="flex items-center justify-between mb-2">
        <input
          type="text"
          value={track.name}
          onChange={handleNameChange}
          className="w-full bg-transparent text-sm text-daw-control font-bold outline-none"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-daw-control hover:text-primary"
            onClick={(e) => { e.stopPropagation(); setShowPalette((v) => !v); }}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-daw-control hover:text-primary ml-1"
            onClick={(e) => { e.stopPropagation(); toggleEffectsPanel(); }}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-daw-control hover:text-destructive ml-1"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {showPalette && (
        <div className="flex gap-2 mb-2 px-1 py-1 rounded bg-daw-panel border border-daw-control z-20 absolute mt-7">
          {COLORS.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded-full border-2 border-white focus:outline-none"
              style={{ background: color, boxShadow: track.color === color ? '0 0 0 2px #fff' : undefined }}
              onClick={(e) => { e.stopPropagation(); handleColorChange(color); }}
            />
          ))}
        </div>
      )}
      <div className="flex items-center mb-3">
        <Volume2 className="h-4 w-4 mr-2 text-daw-control" />
          <Slider 
            value={[track.volume]} 
            min={0} 
            max={1} 
            step={0.01} 
            onValueChange={handleVolumeChange}
          className="flex-1"
          style={{ '--slider-color': track.color || '#a78bfa' } as React.CSSProperties }
          />
      </div>
      <div className="flex gap-2 mt-auto justify-between">
        <Button
          variant={track.muted ? 'secondary' : 'ghost'}
          className={cn('w-12 h-7 text-xs px-1 py-0.5', track.muted ? 'bg-destructive text-white' : 'text-daw-control')}
          onClick={(e) => {
            e.stopPropagation();
            handleMuteToggle();
          }}
        >
          MUTE
        </Button>
        <Button
          variant={track.soloed ? 'secondary' : 'ghost'}
          className={cn('w-12 h-7 text-xs px-1 py-0.5', track.soloed ? 'bg-daw-accent text-white' : 'text-daw-control')}
          onClick={(e) => {
            e.stopPropagation();
            handleSoloToggle();
          }}
        >
          SOLO
        </Button>
        <Button
          variant={isSelected && isRecording ? 'secondary' : 'ghost'}
          className={cn('w-14 h-7 text-xs px-1 py-0.5 flex items-center justify-center', isSelected && isRecording ? 'bg-destructive text-white animate-pulse' : 'text-daw-control')}
          onClick={(e) => {
            e.stopPropagation();
            handleRecordClick();
          }}
        >
          <Mic className="mr-1 h-3 w-3 align-middle" /> REC
        </Button>
      </div>
    </div>
  );
};

type TrackContentProps = {
  track: TrackType;
  pixelsPerSecond: number;
  height?: number;
};

// Helper function to convert hex color to rgba
function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const TrackContent: React.FC<TrackContentProps> = ({
  track,
  pixelsPerSecond,
  height = 100
}) => {
  const { selectedTrackId, selectTrack } = useAudioEngine();
  const isSelected = selectedTrackId === track.id;
  
  const handleTrackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectTrack(track.id);
  };
  
  return (
    <div 
      className={cn(
        'relative h-24 border-b border-daw-panel px-0.5',
      )}
      style={{
        height: `${height}px`,
        backgroundColor: isSelected 
          ? hexToRgba(track.color || '#a78bfa', 0.3)
          : '#222830',
      }}
      onClick={handleTrackClick}
      data-track-id={track.id}
    >
      {track.clips.map((clip) => (
        <AudioClip
          key={clip.id}
          clip={clip}
          pixelsPerSecond={pixelsPerSecond}
          color={track.color}
        />
      ))}
    </div>
  );
};

// Export Track components
const Track = {
  Controls: TrackControls,
  Content: TrackContent
};

export default Track;
