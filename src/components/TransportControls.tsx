import React from 'react';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import { Button } from '@/components/ui/button';
import { formatTime } from '../utils/audio-utils';
import { Play, Pause, SquareIcon, SkipBack, FileAudio } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '@/hooks/use-toast';

type TransportControlsProps = {
  className?: string;
};

const TransportControls: React.FC<TransportControlsProps> = ({ className }) => {
  const { 
    project, 
    play, 
    pause, 
    stop, 
    seekTo, 
    isRecording, 
    stopRecording,
    exportProject,
    recordingDuration
  } = useAudioEngine();
  
  const handlePlay = () => {
    if (project.isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  const handleStop = () => {
    if (isRecording) {
      stopRecording();
    }
    stop();
  };
  
  const handleRewind = () => {
    // Use seekTo which will properly handle rewinding both during playback and when stopped
    seekTo(0);
  };
  
  const handleExport = async () => {
    try {
      const blob = await exportProject();
      if (!blob) {
        toast({
          title: "Export Failed",
          description: "Unable to export audio. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Clean up project name for filename
      const cleanedProjectName = project.name
        .trim()
        .replace(/[\\/:*?"<>|]/g, '-'); // Replace invalid characters with hyphen
      a.download = `${cleanedProjectName || 'Untitled Project'}.wav`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Your project has been exported as a WAV file.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className={cn('flex items-center bg-black p-3', className)}>
      <div className="mr-4 flex items-center space-x-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRewind}
          disabled={isRecording}
          className="text-daw-control"
        >
          <SkipBack className="h-5 w-5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handlePlay}
          disabled={isRecording}
          className="text-daw-control"
        >
          {project.isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleStop}
          className="text-daw-control"
        >
          <SquareIcon className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="mr-6 text-sm font-mono text-white">
        {formatTime(project.currentTime)}
      </div>
      
      {isRecording && (
        <div className="mr-4 flex items-center text-destructive">
          <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-destructive"></div>
          <span className="text-xs font-medium">RECORDING</span>
          <span className="ml-2 text-xs font-mono">{formatTime(recordingDuration)}</span>
        </div>
      )}
      
      <div className="ml-auto">
        <Button 
          variant="ghost" 
          className="flex items-center space-x-1 text-daw-control"
          onClick={handleExport}
        >
          <FileAudio className="mr-1 h-4 w-4" />
          <span>Export</span>
        </Button>
      </div>
    </div>
  );
};

export default TransportControls;
