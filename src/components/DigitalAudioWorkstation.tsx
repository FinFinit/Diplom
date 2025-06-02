import React, { useState } from 'react';
import { AudioEngineProvider, useAudioEngine } from '../contexts/AudioEngineContext';
import TrackList from './TrackList';
import TransportControls from './TransportControls';
import FileImport from './FileImport';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';
import DigitalAudioWorkstationContent from './DigitalAudioWorkstationContent';

const DigitalAudioWorkstation: React.FC = () => {
  return (
    <AudioEngineProvider>
      <DigitalAudioWorkstationContent />
    </AudioEngineProvider>
  );
};

export default DigitalAudioWorkstation;
