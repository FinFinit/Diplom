import React from 'react';
import { useAudioEngine } from '../contexts/AudioEngineContext';
import TrackList from './TrackList';
import TransportControls from './TransportControls';
import FileImport from './FileImport';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';

const DigitalAudioWorkstationContent: React.FC = () => {
  const { project, updateProjectName } = useAudioEngine();
  
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-daw-panel bg-daw-bg p-4">
        <div className="flex items-center">
          <img src="/src/rgr1.png" alt="SimpliDAW Logo" className="mr-2 h-8" />
          <h1 className="mr-4 text-xl font-bold text-white">SimpliDAW</h1>
          <Input
            value={project.name}
            onChange={(e) => updateProjectName(e.target.value)}
            className="max-w-[300px] border-daw-panel bg-daw-panel text-white"
            placeholder="Project Name"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <FileImport />
        </div>
      </header>
      
      {/* Transport controls */}
      <TransportControls className="border-b border-daw-panel" />
      
      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <TrackList className="h-full" />
      </div>
    
    <Toaster position="top-right" />
    </div>
  );
};

export default DigitalAudioWorkstationContent; 