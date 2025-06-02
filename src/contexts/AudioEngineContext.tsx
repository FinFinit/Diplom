import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

// Define the types for our audio clips and tracks
export type AudioClip = {
  id: string;
  trackId: string;
  audioBuffer: AudioBuffer;
  startTime: number; // In seconds
  duration: number; // In seconds
  waveform: number[];
  name: string;
  color?: string;
};

export type Effect = {
  id: string;
  type: 'eq' | 'compressor' | 'reverb';
  params: {
    low?: number;
    mid?: number;
    high?: number;
    peakReduction?: number; // 0-100, controls compression amount
    gain?: number; // -20 to +20 dB, makeup gain
    mix?: number; // 0-100%, wet/dry mix
    size?: number; // 0-100%, room size
  };
  enabled: boolean; // Добавляем флаг активности эффекта
};

export type Track = {
  id: string;
  name: string;
  clips: AudioClip[];
  volume: number;
  muted: boolean;
  soloed: boolean;
  color?: string;
  effects: Effect[]; // Добавляем массив эффектов к треку
};

export type Project = {
  name: string;
  tracks: Track[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
};

// Context type
export type AudioEngineContextType = {
  audioContext: AudioContext | null;
  project: Project;
  playingNodes: Map<string, AudioNode[]>;
  isRecording: boolean;
  selectedTrackId: string | null;
  selectedClipIds: string[];
  recordingStartTime: number | null;
  recordingDuration: number;
  
  // Project actions
  createProject: (name: string) => void;
  updateProjectName: (name: string) => void;
  
  // Track actions
  addTrack: () => void;
  removeTrack: (trackId: string) => void;
  updateTrackName: (trackId: string, name: string) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  selectTrack: (trackId: string | null) => void;
  updateTrackColor: (trackId: string, color: string) => void;
  
  // Clip actions
  addClip: (trackId: string, audioBuffer: AudioBuffer, startTime: number, name: string) => Promise<void>;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, trackId: string, startTime: number) => void;
  trimClip: (clipId: string, startOffset: number, endOffset: number) => void;
  selectClip: (clipId: string, addToSelection?: boolean) => void;
  clearClipSelection: () => void;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => Promise<void>;
  setZoom: (zoom: number) => void;
  
  // Recording
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  
  // Export
  exportProject: () => Promise<Blob | null>;
  
  // New actions
  splitClip: (clipId: string) => Promise<void>;
  
  // Effects actions
  addEffect: (trackId: string, type: Effect['type'], initialParams: Effect['params']) => void;
  updateEffectParams: (trackId: string, effectId: string, updates: any) => void;
  removeEffect: (trackId: string, effectId: string) => void;
  
  // UI State
  showEffectsPanel: boolean;
  toggleEffectsPanel: () => void;
};

// Create the context with default values
const AudioEngineContext = createContext<AudioEngineContextType | null>(null);

// Initial project state
const initialProject: Project = {
  name: 'Untitled Project',
  tracks: [],
  duration: 60, // Default 60 seconds
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
};

export const AudioEngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create audio context
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [project, setProject] = useState<Project>(initialProject);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  
  // Refs for audio playback
  const playingNodes = useRef<Map<string, AudioNode[]>>(new Map());
  const animationFrameId = useRef<number | null>(null);
  const recorderRef = useRef<{ start: () => Promise<boolean>; stop: () => boolean } | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<number | null>(null);
  
  // UI State
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  
  // Initialize audio context
  useEffect(() => {
    const initAudioContext = () => {
      try {
        const context = new AudioContext();
        setAudioContext(context);
        return context;
      } catch (error) {
        console.error('Failed to create AudioContext:', error);
        return null;
      }
    };
    
    // Only create the audio context on user interaction
    const handleInteraction = () => {
      if (!audioContext) {
        initAudioContext();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      }
    };
    
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [audioContext]);
  
  // Update current time during playback
  useEffect(() => {
    if (project.isPlaying && audioContext) {
      const updateTime = () => {
        const newTime = (audioContext.currentTime - startTimeRef.current) + project.currentTime;
        setProject(prev => ({
          ...prev,
          currentTime: Math.min(newTime, prev.duration),
        }));
        
        // Stop playback if we've reached the end
        if (newTime >= project.duration) {
          stopPlayback();
        } else {
          animationFrameId.current = requestAnimationFrame(updateTime);
        }
      };
      
      animationFrameId.current = requestAnimationFrame(updateTime);
    }
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [project.isPlaying, audioContext, project.duration]);
  
  // Create a new project
  const createProject = (name: string) => {
    setProject({
      ...initialProject,
      name,
    });
  };
  
  // Update project name
  const updateProjectName = (name: string) => {
    setProject(prev => ({
      ...prev,
      name,
    }));
  };
  
  // Track actions
  const addTrack = () => {
    const newTrack: Track = {
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Track ${project.tracks.length + 1}`,
      clips: [],
      volume: 1,
      muted: false,
      soloed: false,
      effects: [], // Инициализируем массив эффектов пустым
    };
    
    setProject(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
    
    // Select the newly created track
    setSelectedTrackId(newTrack.id);
  };
  
  const removeTrack = (trackId: string) => {
    // Remove all clips in the track first
    const trackToRemove = project.tracks.find(track => track.id === trackId);
    if (trackToRemove) {
      trackToRemove.clips.forEach(clip => {
        const nodes = playingNodes.current.get(clip.id);
        if (nodes) {
          nodes.forEach(node => {
            if ('disconnect' in node) {
              try {
                (node as AudioNode).disconnect();
              } catch (error) {
                console.error('Error disconnecting audio node:', error);
              }
            }
          });
          playingNodes.current.delete(clip.id);
        }
      });
    }
    
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.filter(track => track.id !== trackId),
    }));
    
    // Clear track selection if the removed track was selected
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }
    
    // Remove any selected clips that were on this track
    setSelectedClipIds(prev => prev.filter(clipId => {
      const clip = findClipById(clipId);
      return clip && clip.trackId !== trackId;
    }));
  };
  
  const updateTrackName = (trackId: string, name: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId ? { ...track, name } : track
      ),
    }));
  };
  
  const updateTrackVolume = (trackId: string, volume: number) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId ? { ...track, volume } : track
      ),
    }));
    
    // Update volume for all playing clips in this track
    project.tracks
      .find(track => track.id === trackId)
      ?.clips.forEach(clip => {
        const nodes = playingNodes.current.get(clip.id);
        if (nodes) {
          nodes.forEach(node => {
            if ('gain' in node) {
              (node as GainNode).gain.value = volume;
            }
          });
        }
      });
  };
  
  const toggleTrackMute = (trackId: string) => {
    setProject(prev => {
      const updatedTracks = prev.tracks.map(track => 
        track.id === trackId ? { ...track, muted: !track.muted } : track
      );
      
      // Update the audio nodes for the affected track
      const track = updatedTracks.find(t => t.id === trackId);
      if (track) {
        track.clips.forEach(clip => {
          const nodes = playingNodes.current.get(clip.id);
          if (nodes) {
            nodes.forEach(node => {
              if ('gain' in node) {
                (node as GainNode).gain.value = track.muted ? 0 : track.volume;
              }
            });
          }
        });
      }
      
      return {
        ...prev,
        tracks: updatedTracks,
      };
    });
  };
  
  const toggleTrackSolo = (trackId: string) => {
    setProject(prev => {
      // Toggle solo for the specified track
      const updatedTracks = prev.tracks.map(track => 
        track.id === trackId ? { ...track, soloed: !track.soloed } : track
      );
      
      // Check if any track is now soloed
      const anySoloed = updatedTracks.some(track => track.soloed);
      
      // Update audio nodes based on solo status
      updatedTracks.forEach(track => {
        const shouldPlay = !anySoloed || track.soloed;
        const effectiveVolume = (shouldPlay && !track.muted) ? track.volume : 0;
        
        track.clips.forEach(clip => {
          const nodes = playingNodes.current.get(clip.id);
          if (nodes) {
            nodes.forEach(node => {
              if ('gain' in node) {
                (node as GainNode).gain.value = effectiveVolume;
              }
            });
          }
        });
      });
      
      return {
        ...prev,
        tracks: updatedTracks,
      };
    });
  };
  
  const selectTrack = (trackId: string | null) => {
    setSelectedTrackId(trackId);
  };
  
  const updateTrackColor = (trackId: string, color: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, color } : track
      ),
    }));
  };
  
  // Helper to find a track by its ID
  const findTrackById = (trackId: string): Track | undefined => {
    return project.tracks.find(track => track.id === trackId);
  };
  
  // Helper to find a clip by its ID
  const findClipById = (clipId: string): AudioClip | undefined => {
    for (const track of project.tracks) {
      const clip = track.clips.find(clip => clip.id === clipId);
      if (clip) {
        return clip;
      }
    }
    return undefined;
  };
  
  // Clip actions
  const addClip = async (trackId: string, audioBuffer: AudioBuffer, startTime: number, name: string) => {
    if (!audioContext) return;
    
    try {
      // Get normalized waveform data
      const waveform: number[] = [];
      const channelData = audioBuffer.getChannelData(0);
      // Увеличиваем количество точек для более детального отображения
      const numPoints = Math.min(5000, channelData.length);
      const blockSize = Math.floor(channelData.length / numPoints);
      
      for (let i = 0; i < numPoints; i++) {
        const startSample = blockSize * i;
        let sum = 0;
        
        for (let j = 0; j < blockSize && (startSample + j) < channelData.length; j++) {
          sum += Math.abs(channelData[startSample + j]);
        }
        
        waveform.push(sum / blockSize);
      }
      
      const newClip: AudioClip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        trackId,
        audioBuffer,
        startTime,
        duration: audioBuffer.duration,
        waveform,
        name: name || `Clip ${Date.now()}`,
      };
      
      setProject(prev => {
        const updatedTracks = prev.tracks.map(track => {
          if (track.id === trackId) {
            return {
              ...track,
              clips: [...track.clips, newClip],
            };
          }
          return track;
        });
        
        return {
          ...prev,
          tracks: updatedTracks,
          // Extend project duration if needed
          duration: Math.max(prev.duration, startTime + audioBuffer.duration),
        };
      });
      
      // Select the newly created clip
      setSelectedClipIds([newClip.id]);
    } catch (error) {
      console.error('Error adding clip:', error);
    }
  };
  
  const removeClip = (clipId: string) => {
    // Stop and remove any playing nodes for this clip
    const nodes = playingNodes.current.get(clipId);
    if (nodes) {
      nodes.forEach(node => {
        if ('disconnect' in node) {
          try {
            (node as AudioNode).disconnect();
          } catch (error) {
            console.error('Error disconnecting audio node:', error);
          }
        }
      });
      playingNodes.current.delete(clipId);
    }
    
    // Remove the clip from its track
    setProject(prev => {
      const updatedTracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.id !== clipId),
      }));
      
      return {
        ...prev,
        tracks: updatedTracks,
      };
    });
    
    // Remove from selection
    setSelectedClipIds(prev => prev.filter(id => id !== clipId));
  };
  
  const moveClip = (clipId: string, targetTrackId: string, newStartTime: number) => {
    setProject(prev => {
      const clip = findClipById(clipId);
      if (!clip) return prev;
      
      const sourceTrackId = clip.trackId;
      
      // Store the playback state before the update
      const wasPlaying = prev.isPlaying;

      // If moving to same track, just update start time
      if (sourceTrackId === targetTrackId) {
        const updatedTracks = prev.tracks.map(track => {
          if (track.id === sourceTrackId) {
            return {
              ...track,
              clips: track.clips.map(c => 
                c.id === clipId ? { ...c, startTime: newStartTime } : c
              ),
            };
          }
          return track;
        });
        
        return {
          ...prev,
          tracks: updatedTracks,
          // Extend project duration if needed
          duration: Math.max(prev.duration, newStartTime + clip.duration),
          // Keep isPlaying state as it was before the update
          isPlaying: wasPlaying, // Ensure state is preserved for re-triggering play if needed
        };
      }
      
      // If moving to different track, remove from source and add to target
      const updatedTracks = prev.tracks.map(track => {
        if (track.id === sourceTrackId) {
          return {
            ...track,
            clips: track.clips.filter(c => c.id !== clipId),
          };
        }
        
        if (track.id === targetTrackId) {
          return {
            ...track,
            clips: [
              ...track.clips,
              { ...clip, trackId: targetTrackId, startTime: newStartTime },
            ],
          };
        }
        
        return track;
      });
      
      // If the project was playing, stop and restart playback
      // to ensure all nodes are correctly rescheduled.
      // Use a small timeout to allow state update to propagate.
      if (project.isPlaying) { // Check the state AFTER setProject has potentially updated it
          stopPlayback(false); // Stop current playback
          setTimeout(() => {
             // Double check that we still want to play
             if (project.isPlaying === false) { // Check the state again before playing
               play(); // Restart playback with updated clip positions
             }
          }, 50); // Small delay
      }
      
      return {
        ...prev,
        tracks: updatedTracks,
        // Extend project duration if needed
        duration: Math.max(prev.duration, newStartTime + clip.duration),
        // Keep isPlaying state as it was before the update
        isPlaying: wasPlaying, // Ensure state is preserved for re-triggering play if needed
      };
    });
  };
  
  const trimClip = (clipId: string, startOffset: number, endOffset: number) => {
    setProject(prev => {
      const updatedTracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const newStartTime = clip.startTime + startOffset;
            const newDuration = clip.duration - startOffset - endOffset;
            
            return {
              ...clip,
              startTime: newStartTime,
              duration: newDuration,
            };
          }
          return clip;
        }),
      }));
      
      return {
        ...prev,
        tracks: updatedTracks,
      };
    });
  };
  
  const selectClip = (clipId: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedClipIds(prev => 
        prev.includes(clipId) 
          ? prev.filter(id => id !== clipId) // Toggle selection if already selected
          : [...prev, clipId]
      );
    } else {
      setSelectedClipIds([clipId]);
    }
  };
  
  const clearClipSelection = () => {
    setSelectedClipIds([]);
  };
  
  // Playback controls
  const playClipAtTime = useCallback((clip: AudioClip, timeOffset: number = 0) => {
    if (!audioContext) return;
    
    // Create a buffer source node
    const source = audioContext.createBufferSource();
    source.buffer = clip.audioBuffer;
    
    // Find the track to get its effects
    const track = findTrackById(clip.trackId);
    if (!track) {
      console.error("Track not found for clip:", clip.id);
      return;
    }
    
    // Create a gain node for volume control
    const gainNode = audioContext.createGain();
    
    // Add fade in/out for smoother transitions
    const fadeInDuration = 0.005; // 5ms fade in
    const fadeOutDuration = 0.005; // 5ms fade out
    
    // Set initial gain to 0 for fade in
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + timeOffset);
    // Fade in
    gainNode.gain.linearRampToValueAtTime(track.volume, audioContext.currentTime + timeOffset + fadeInDuration);
    // Fade out at the end
    gainNode.gain.setValueAtTime(track.volume, audioContext.currentTime + timeOffset + clip.duration - fadeOutDuration);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + timeOffset + clip.duration);

    // --- Effect Chain ---
    let lastNode: AudioNode = source;
    let effectNodes: AudioNode[] = []; // Store effect nodes for cleanup

    if (track.effects && track.effects.length > 0) {
      track.effects.forEach(effect => {
        if (!effect.enabled) return;

        let effectNode: AudioNode | null = null;

        if (effect.type === 'eq') {
          const eqParams = effect.params;
          if (eqParams) {
            const lowShelf = audioContext.createBiquadFilter();
            lowShelf.type = 'lowshelf';
            lowShelf.frequency.setValueAtTime(250, audioContext.currentTime);
            lowShelf.gain.setValueAtTime(eqParams.low, audioContext.currentTime);

            const peaking = audioContext.createBiquadFilter();
            peaking.type = 'peaking';
            peaking.frequency.setValueAtTime(1000, audioContext.currentTime);
            peaking.Q.setValueAtTime(1, audioContext.currentTime);
            peaking.gain.setValueAtTime(eqParams.mid, audioContext.currentTime);

            const highShelf = audioContext.createBiquadFilter();
            highShelf.type = 'highshelf';
            highShelf.frequency.setValueAtTime(4000, audioContext.currentTime);
            highShelf.gain.setValueAtTime(eqParams.high, audioContext.currentTime);

            lastNode.connect(lowShelf);
            lowShelf.connect(peaking);
            peaking.connect(highShelf);

            effectNode = highShelf;
            effectNodes.push(lowShelf, peaking, highShelf);
          }
        } else if (effect.type === 'compressor') {
          const compParams = effect.params;
          if (compParams) {
            const compressor = audioContext.createDynamicsCompressor();
            const threshold = -20 - (compParams.peakReduction * 0.4);
            compressor.threshold.setValueAtTime(threshold, audioContext.currentTime);
            
            const baseRatio = 3;
            const maxRatio = 20;
            const ratio = baseRatio + (compParams.peakReduction / 100) * (maxRatio - baseRatio);
            compressor.ratio.setValueAtTime(ratio, audioContext.currentTime);
            
            compressor.knee.setValueAtTime(10, audioContext.currentTime);
            
            const attackTime = 0.01 + (1 - compParams.peakReduction / 100) * 0.04;
            compressor.attack.setValueAtTime(attackTime, audioContext.currentTime);
            
            const releaseTime = 0.1 + (compParams.peakReduction / 100) * 0.4;
            compressor.release.setValueAtTime(releaseTime, audioContext.currentTime);
            
            lastNode.connect(compressor);
            effectNode = compressor;
            effectNodes.push(compressor);
          }
        } else if (effect.type === 'reverb') {
          const reverbParams = effect.params;
          if (reverbParams) {
            const convolver = audioContext.createConvolver();
            const size = reverbParams.size / 100;
            const sampleRate = audioContext.sampleRate;
            const length = Math.floor(sampleRate * (0.5 + size * 2));
            const impulseResponse = audioContext.createBuffer(2, length, sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
              const channelData = impulseResponse.getChannelData(channel);
              for (let i = 0; i < length; i++) {
                const decay = Math.exp(-i / (sampleRate * (0.1 + size * 0.4)));
                const noise = (Math.random() * 2 - 1) * decay;
                channelData[i] = noise;
              }
            }
            
            convolver.buffer = impulseResponse;
            
            const dryGain = audioContext.createGain();
            const wetGain = audioContext.createGain();
            
            const mix = reverbParams.mix / 100;
            dryGain.gain.setValueAtTime(1 - mix, audioContext.currentTime);
            wetGain.gain.setValueAtTime(mix, audioContext.currentTime);
            
            const merger = audioContext.createChannelMerger(2);
            
            lastNode.connect(dryGain);
            dryGain.connect(merger, 0, 0);
            dryGain.connect(merger, 0, 1);
            
            lastNode.connect(convolver);
            convolver.connect(wetGain);
            wetGain.connect(merger, 0, 0);
            wetGain.connect(merger, 0, 1);
            
            effectNode = merger;
            effectNodes.push(convolver, dryGain, wetGain, merger);
          }
        }

        if (effectNode) {
          lastNode = effectNode;
        }
      });
    }

    // Connect the end of the effect chain to the gain node
    lastNode.connect(gainNode);
    
    // Apply track volume and mute/solo settings
    const anySoloed = project.tracks.some(t => t.soloed);
    const shouldBeMuted = track.muted || (anySoloed && !track.soloed);
    gainNode.gain.setValueAtTime(shouldBeMuted ? 0 : track.volume, audioContext.currentTime + timeOffset);
    
    // Connect gain node to destination
    gainNode.connect(audioContext.destination);
    
    // Calculate when to start playing this clip
    const clipOffset = Math.max(0, project.currentTime - clip.startTime);
    const clipTimeRemaining = clip.duration - clipOffset;
    
    if (clipTimeRemaining <= 0) {
      return;
    }
    
    // Start playback with precise timing
    const startTime = audioContext.currentTime + timeOffset;
    source.start(startTime, clipOffset, clipTimeRemaining);
    
    // Store all nodes for cleanup
    const allNodes = [source, ...effectNodes, gainNode];
    playingNodes.current.set(clip.id, allNodes); // Store all nodes for cleanup
    
    // Clean up when finished
    source.onended = () => {
      try {
        // Disconnect all nodes in reverse order
        allNodes.reverse().forEach(node => {
          if ('disconnect' in node) {
            (node as AudioNode).disconnect();
          }
        });
      } catch (error) {
        console.error("Error during clip end disconnection:", error);
      } finally {
        playingNodes.current.delete(clip.id);
      }
    };
  }, [audioContext, project.currentTime, project.tracks]);
  
  // Play all clips that should be playing at the current time
  const play = () => {
    if (!audioContext) return;
    
    // Resume audio context if it's suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Set start reference time
    startTimeRef.current = audioContext.currentTime;
    
    // Stop any currently playing clips
    stopPlayback(false);
    
    // Sort clips by start time for better synchronization
    const allClips = project.tracks.flatMap(track => 
      track.clips.map(clip => ({ ...clip, track }))
    ).sort((a, b) => a.startTime - b.startTime);
    
    // Play all clips that overlap with the current time
    allClips.forEach(clip => {
      const clipEndTime = clip.startTime + clip.duration;
      if (clip.startTime <= project.currentTime && clipEndTime > project.currentTime) {
        // Clip is currently playing
        playClipAtTime(clip);
      } else if (clip.startTime > project.currentTime) {
        // Schedule future clip
        const timeOffset = clip.startTime - project.currentTime;
        playClipAtTime(clip, timeOffset);
      }
    });
    
    setProject(prev => ({
      ...prev,
      isPlaying: true,
    }));
  };
  
  const pause = () => {
    // Ensure all audio playback stops
    if (audioContext) {
      // First, stop all currently playing nodes
      stopPlayback(false);
      
      // Set the state to paused
      setProject(prev => ({
        ...prev,
        isPlaying: false,
      }));
      
      // For extra safety, check if the audio context is running and suspend it
      if (audioContext.state === 'running') {
        audioContext.suspend().catch(err => {
          console.error('Error suspending audio context:', err);
        });
      }
    }
  };
  
  const stop = () => {
    stopPlayback(true);
    
    setProject(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
    }));
  };
  
  const stopPlayback = (resetPosition: boolean = false) => {
    console.log('stopPlayback called. Reset position:', resetPosition, 'PlayingNodes size before disconnect:', playingNodes.current.size);
    // Stop and disconnect all playing nodes
    playingNodes.current.forEach((nodesForClip) => {
       try {
         // Disconnect all nodes for this clip in reverse order
         nodesForClip.reverse().forEach(node => {
            if ('stop' in node && typeof (node as any).stop === 'function') {
              // Attempt to stop BufferSourceNodes explicitly
              try {
                console.log('stopPlayback: Attempting to stop node:', node);
                (node as AudioBufferSourceNode).stop();
              } catch (e) { /* ignore errors if already stopped */ }
            }
            if ('disconnect' in node) {
              try {
                console.log('stopPlayback: Attempting to disconnect node:', node);
                (node as AudioNode).disconnect();
              } catch (e) { /* ignore errors if already disconnected */ }
            }
         });
       } catch (error) {
         console.error('Error stopping/disconnecting audio node during stopPlayback:', error);
       }
    });
    
    console.log('stopPlayback: Nodes processed. PlayingNodes size before clear:', playingNodes.current.size);

    // Clear the map
    playingNodes.current.clear();
    console.log('stopPlayback: playingNodes cleared. Size after clear:', playingNodes.current.size);
    
    // Cancel the animation frame
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    
    // Reset position if requested
    if (resetPosition) {
      setProject(prev => ({
        ...prev,
        currentTime: 0,
      }));
    }
  };
  
  const seekTo = async (time: number) => {
    // Clamp time to valid range
    const newTime = Math.max(0, Math.min(time, project.duration));
    
    console.log('Seeking to', newTime, 'Current playingNodes size:', playingNodes.current.size);

    // Store current playback state (not directly used for resume here, but good practice)
    const wasPlaying = project.isPlaying; 

    // Close AudioContext to ensure all sound stops immediately
    if (audioContext) {
      console.log('Closing audio context...');
      await audioContext.close();
      setAudioContext(null); // Set state to null after closing
      console.log('Audio context closed and state set to null.');
    }

    // No need to call stopPlayback or clear playingNodes here, closing context handles it.
    // playingNodes.current.clear(); // This map will be stale anyway after context is closed

    // Update the current time and set to paused
    setProject(prev => ({
      ...prev,
      currentTime: newTime,
      isPlaying: false, // Always pause after seeking
    }));

    console.log('SeekTo finished. project.currentTime:', newTime, 'project.isPlaying:', false);
    
    // Removed logic for resuming context or playback
  };
  
  const setZoom = (zoom: number) => {
    setProject(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(10, zoom)),
    }));
  };
  
  // Recording
  const startRecording = async () => {
    if (!audioContext || !selectedTrackId || isRecording) {
      return false;
    }
    
    try {
      // Set up the recorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      // Create a temporary audio context for real-time monitoring
      const tempContext = new AudioContext();
      const source = tempContext.createMediaStreamSource(stream);
      const analyser = tempContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      // Create a temporary buffer for real-time waveform
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      
      // Set recording start time and start updating duration
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      
      // Update recording duration and waveform every 100ms
      recordingIntervalRef.current = window.setInterval(() => {
        const currentDuration = (Date.now() - startTime) / 1000;
        setRecordingDuration(currentDuration);
        
        // Update playhead position during recording
        setProject(prev => ({
          ...prev,
          currentTime: project.currentTime + 0.1 // Increment by 100ms
        }));
        
        // Update waveform data
        analyser.getFloatTimeDomainData(dataArray);
        const waveform = Array.from(dataArray).map(Math.abs);
        
        // Create a temporary clip for visualization
        const tempClip: AudioClip = {
          id: 'temp-recording',
          trackId: selectedTrackId,
          audioBuffer: tempContext.createBuffer(1, bufferLength, tempContext.sampleRate),
          startTime: project.currentTime,
          duration: currentDuration,
          waveform,
          name: 'Recording...'
        };
        
        // Update the project with the temporary clip
        setProject(prev => ({
          ...prev,
          tracks: prev.tracks.map(track =>
            track.id === selectedTrackId
              ? {
                  ...track,
                  clips: track.clips.filter(clip => clip.id !== 'temp-recording').concat(tempClip)
                }
              : track
          )
        }));
      }, 100);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Clean up temporary context
        tempContext.close();
        
        // Create a blob from the recorded chunks
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          // Convert blob to array buffer
          const arrayBuffer = await blob.arrayBuffer();
          
          // Decode the audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Add the clip to the selected track
          addClip(
            selectedTrackId,
            audioBuffer,
            project.currentTime - recordingDuration,
            `Recording ${new Date().toLocaleTimeString()}`
          );
        } catch (error) {
          console.error('Error processing recorded audio:', error);
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingStartTime(null);
        setRecordingDuration(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        
        // Remove temporary clip
        setProject(prev => ({
          ...prev,
          tracks: prev.tracks.map(track =>
            track.id === selectedTrackId
              ? {
                  ...track,
                  clips: track.clips.filter(clip => clip.id !== 'temp-recording')
                }
              : track
          )
        }));
      };
      
      // Save recorder reference
      recorderRef.current = {
        start: async () => true,
        stop: () => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            return true;
          }
          return false;
        },
      };
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  };
  
  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    // Clean up recording state
    setRecordingStartTime(null);
    setRecordingDuration(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };
  
  // Export project
  const exportProject = async (): Promise<Blob | null> => {
    if (!audioContext) {
      console.error('Audio context not available');
      return null;
    }
    
    try {
      // Create a new offline audio context for rendering
      const offlineContext = new OfflineAudioContext(
        2,
        audioContext.sampleRate * project.duration,
        audioContext.sampleRate
      );
      
      // For each track, create and connect audio nodes
      const trackPromises = project.tracks.map(async (track) => {
        if (track.muted) return;
        
        for (const clip of track.clips) {
          // Create source node
          const source = offlineContext.createBufferSource();
          source.buffer = clip.audioBuffer;
          
          let lastNode: AudioNode = source; // Start chain with source

           // Add effects for offline rendering
           if (track.effects && track.effects.length > 0) {
               track.effects.forEach(effect => {
                   let effectNode: AudioNode | null = null;
                   
                   // Check if the effect is enabled for export
                   if (!effect.enabled) {
                       return; // Skip disabled effects
                   }

                   if (effect.type === 'eq') {
                       const eqParams = effect.params;
                       if (eqParams && offlineContext) { // Use offlineContext here
                           const lowShelf = offlineContext.createBiquadFilter();
                           lowShelf.type = 'lowshelf';
                           lowShelf.frequency.setValueAtTime(250, offlineContext.currentTime);
                           lowShelf.gain.setValueAtTime(eqParams.low, offlineContext.currentTime);

                           const peaking = offlineContext.createBiquadFilter();
                           peaking.type = 'peaking';
                           peaking.frequency.setValueAtTime(1000, offlineContext.currentTime);
                           peaking.Q.setValueAtTime(1, offlineContext.currentTime);
                           peaking.gain.setValueAtTime(eqParams.mid, offlineContext.currentTime);

                           const highShelf = offlineContext.createBiquadFilter();
                           highShelf.type = 'highshelf';
                           highShelf.frequency.setValueAtTime(4000, offlineContext.currentTime);
                           highShelf.gain.setValueAtTime(eqParams.high, offlineContext.currentTime);

                           lastNode.connect(lowShelf);
                           lowShelf.connect(peaking);
                           peaking.connect(highShelf);

                           effectNode = highShelf;
                       }
                   } else if (effect.type === 'compressor') {
                       const compParams = effect.params;
                       if (compParams && offlineContext) {
                            const compressor = offlineContext.createDynamicsCompressor();
                            const threshold = -20 - (compParams.peakReduction * 0.4);
                            compressor.threshold.setValueAtTime(threshold, offlineContext.currentTime);

                            const baseRatio = 3;
                            const maxRatio = 20;
                            const ratio = baseRatio + (compParams.peakReduction / 100) * (maxRatio - baseRatio);
                            compressor.ratio.setValueAtTime(ratio, offlineContext.currentTime);

                            compressor.knee.setValueAtTime(10, offlineContext.currentTime);

                            const attackTime = 0.01 + (1 - compParams.peakReduction / 100) * 0.04;
                            compressor.attack.setValueAtTime(attackTime, offlineContext.currentTime);

                            const releaseTime = 0.1 + (compParams.peakReduction / 100) * 0.4;
                            compressor.release.setValueAtTime(releaseTime, offlineContext.currentTime);

                            lastNode.connect(compressor);
                            effectNode = compressor;
                       }
                   } else if (effect.type === 'reverb') {
                       const reverbParams = effect.params;
                       if (reverbParams && offlineContext) {
                           const convolver = offlineContext.createConvolver();
                           // Note: For offline rendering, we might need a pre-rendered impulse response
                           // or ensure the impulse response creation is compatible with OfflineAudioContext.
                           // For simplicity, using the same impulse response generation logic as playback for now.
                           const size = reverbParams.size / 100;
                           const sampleRate = offlineContext.sampleRate;
                           const length = Math.floor(sampleRate * (0.5 + size * 2));
                           const impulseResponse = offlineContext.createBuffer(2, length, sampleRate);

                           for (let channel = 0; channel < 2; channel++) {
                             const channelData = impulseResponse.getChannelData(channel);
                             for (let i = 0; i < length; i++) {
                               const decay = Math.exp(-i / (sampleRate * (0.1 + size * 0.4)));
                               const noise = (Math.random() * 2 - 1) * decay;
                               channelData[i] = noise;
                             }
                           }

                           convolver.buffer = impulseResponse;

                           const dryGain = offlineContext.createGain();
                           const wetGain = offlineContext.createGain();

                           const mix = reverbParams.mix / 100;
                           dryGain.gain.setValueAtTime(1 - mix, offlineContext.currentTime);
                           wetGain.gain.setValueAtTime(mix, offlineContext.currentTime);

                           const merger = offlineContext.createChannelMerger(2);

                           lastNode.connect(dryGain);
                           dryGain.connect(merger, 0, 0);
                           dryGain.connect(merger, 0, 1);

                           lastNode.connect(convolver);
                           convolver.connect(wetGain);
                           wetGain.connect(merger, 0, 0);
                           wetGain.connect(merger, 0, 1);

                           effectNode = merger;
                       }
                   }

                   if(effectNode) {
                       lastNode = effectNode;
                   }
               });
           }

          
          // Create gain node
          const gainNode = offlineContext.createGain(); // Use offlineContext here
          gainNode.gain.value = track.volume;
          
          // Connect effect chain end to gain node
          lastNode.connect(gainNode);

          // Connect gain to destination
          gainNode.connect(offlineContext.destination);
          
          // Schedule start
          source.start(clip.startTime);
        }
      });
      
      // Wait for all tracks to be processed
      await Promise.all(trackPromises);
      
      // Render audio
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV
      const wav = encodeWAV(renderedBuffer);
      return new Blob([wav], { type: 'audio/wav' });
    } catch (error) {
      console.error('Error exporting project:', error);
      return null;
    }
  };
  
  // Utility to encode AudioBuffer to WAV format
  function encodeWAV(buffer: AudioBuffer): ArrayBuffer {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2;
    const sampleRate = buffer.sampleRate;
    const result = new ArrayBuffer(44 + length);
    const view = new DataView(result);
    
    // RIFF chunk descriptor
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeUTFBytes(view, 8, 'WAVE');
    
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChan * 2, true);
    view.setUint16(32, numOfChan * 2, true);
    view.setUint16(34, 16, true);
    
    // Data sub-chunk
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, length, true);
    
    // Write the PCM samples
    const channels = [];
    let offset = 44;
    
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    for (let i = 0; i < buffer.length; i++) {
      for (let j = 0; j < numOfChan; j++) {
        const sample = Math.max(-1, Math.min(1, channels[j][i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, value, true);
        offset += 2;
      }
    }
    
    return result;
  }
  
  function writeUTFBytes(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  // Split audio clip at current playhead
  const splitClip = async (clipId: string) => {
    const clip = findClipById(clipId);
    if (!clip || !audioContext) return;
    const splitTime = project.currentTime;
    // Проверяем, находится ли Playhead внутри клипа
    if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) return;
    const relSplit = splitTime - clip.startTime;
    // Получаем исходные данные
    const { audioBuffer } = clip;
    const sampleRate = audioBuffer.sampleRate;
    const startSample = 0;
    const splitSample = Math.floor(relSplit * sampleRate);
    const endSample = audioBuffer.length;
    // Создаём два новых AudioBuffer
    const buffer1 = audioContext.createBuffer(audioBuffer.numberOfChannels, splitSample, sampleRate);
    const buffer2 = audioContext.createBuffer(audioBuffer.numberOfChannels, endSample - splitSample, sampleRate);
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      buffer1.copyToChannel(audioBuffer.getChannelData(ch).slice(startSample, splitSample), ch, 0);
      buffer2.copyToChannel(audioBuffer.getChannelData(ch).slice(splitSample, endSample), ch, 0);
    }
    // Добавляем новые клипы
    await addClip(clip.trackId, buffer1, clip.startTime, clip.name + ' (1)');
    await addClip(clip.trackId, buffer2, splitTime, clip.name + ' (2)');
    // Удаляем исходный клип
    removeClip(clipId);
  };
  
  const toggleEffectsPanel = () => {
    setShowEffectsPanel(prev => !prev);
  };
  
  // Effects actions
  const addEffect = (trackId: string, type: Effect['type'], initialParams: Effect['params']) => {
    setProject(prev => {
      const track = prev.tracks.find(t => t.id === trackId);
      if (!track) return prev;

      const newEffect: Effect = {
        id: crypto.randomUUID(),
        type,
        params: type === 'eq' 
          ? { low: 0, mid: 0, high: 0, ...initialParams }
          : type === 'compressor'
          ? { peakReduction: 0, gain: 0, ...initialParams }
          : type === 'reverb'
          ? { mix: 50, size: 50, ...initialParams }
          : initialParams,
        enabled: true, // Эффект включен по умолчанию
      };

      return {
        ...prev,
        tracks: prev.tracks.map(t => 
          t.id === trackId 
            ? { ...t, effects: [...t.effects, newEffect] }
            : t
        )
      };
    });
  };
  
  const updateEffectParams = (trackId: string, effectId: string, updates: any) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              effects: track.effects.map(effect =>
                effect.id === effectId
                  ? {
                      ...effect,
                      enabled: updates.enabled !== undefined ? updates.enabled : effect.enabled,
                      params: {
                        ...effect.params,
                        ...updates
                      }
                    }
                  : effect
              ),
            }
          : track
      ),
    }));
  };
  
  const removeEffect = (trackId: string, effectId: string) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, effects: track.effects.filter(effect => effect.id !== effectId) } : track
      ),
    }));
  };
  
  // Context value
  const contextValue: AudioEngineContextType = {
    audioContext,
    project,
    playingNodes: playingNodes.current,
    isRecording,
    selectedTrackId,
    selectedClipIds,
    recordingStartTime,
    recordingDuration,
    
    createProject,
    updateProjectName,
    
    addTrack,
    removeTrack,
    updateTrackName,
    updateTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
    selectTrack,
    updateTrackColor,
    
    addClip,
    removeClip,
    moveClip,
    trimClip,
    selectClip,
    clearClipSelection,
    
    play,
    pause,
    stop,
    seekTo,
    setZoom,
    
    startRecording,
    stopRecording,
    
    exportProject,
    
    splitClip,

    // Effects actions
    addEffect,
    updateEffectParams,
    removeEffect,

    // UI State
    showEffectsPanel,
    toggleEffectsPanel,
  };

  return (
    <AudioEngineContext.Provider value={contextValue}>
      {children}
    </AudioEngineContext.Provider>
  );
};

// Custom hook to use the context
export const useAudioEngine = (): AudioEngineContextType => {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error('useAudioEngine must be used within an AudioEngineProvider');
  }
  return {
        ...context,
        playingNodes: context.playingNodes,
  };
};
