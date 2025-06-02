
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import { toast } from '@/hooks/use-toast';
import { createAudioBufferFromFile } from '../utils/audio-utils';
import { Upload } from 'lucide-react';

const FileImport: React.FC = () => {
  const { addClip, selectedTrackId, project } = useAudioEngine();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedTrackId) {
      return;
    }
    
    try {
      const file = e.target.files[0];
      
      // Check if it's an audio file
      if (!file.type.startsWith('audio/')) {
        toast({
          title: "Invalid file",
          description: "Please select an audio file (WAV, MP3, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Processing audio",
        description: "Please wait while we process the audio file...",
      });
      
      // Process file and create an audio buffer
      const audioBuffer = await createAudioBufferFromFile(file);
      
      // Add the clip to the selected track
      await addClip(
        selectedTrackId,
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
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleUploadClick = () => {
    if (!selectedTrackId) {
      toast({
        title: "No track selected",
        description: "Please select a track first.",
        variant: "destructive",
      });
      return;
    }
    
    fileInputRef.current?.click();
  };
  
  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <Button 
        variant="ghost" 
        onClick={handleUploadClick}
        className="flex items-center text-daw-control"
      >
        <Upload className="mr-2 h-4 w-4" />
        Import Audio
      </Button>
    </div>
  );
};

export default FileImport;
