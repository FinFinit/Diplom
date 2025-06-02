/**
 * Audio utility functions for the DAW
 */

/**
 * Converts audio buffer to a normalized array of sample values
 * @param audioBuffer - The audio buffer to process
 * @param numPoints - The number of points to return (resolution of waveform)
 * @returns Normalized waveform data points between -1 and 1
 */
export function getWaveformData(audioBuffer: AudioBuffer, numPoints: number = 1000): number[] {
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const blockSize = Math.floor(channelData.length / numPoints);
  const waveform: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const startSample = blockSize * i;
    let sum = 0;
    
    // Calculate average amplitude in this block
    for (let j = 0; j < blockSize && (startSample + j) < channelData.length; j++) {
      sum += Math.abs(channelData[startSample + j]);
    }
    
    waveform.push(sum / blockSize);
  }

  return waveform;
}

/**
 * Creates an audio buffer from a file
 * @param file - The audio file to process
 * @returns Promise resolving to an AudioBuffer
 */
export async function createAudioBufferFromFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Records audio from the user's microphone
 * @param onDataAvailable - Callback for when audio data is available
 * @param onStop - Callback for when recording stops
 * @returns Object with start and stop functions
 */
export function createAudioRecorder(
  onDataAvailable: (data: Blob) => void,
  onStop: () => void
) {
  let mediaRecorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        chunks.length = 0;
        onDataAvailable(blob);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
        onStop();
      };

      mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  };

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      return true;
    }
    return false;
  };

  return { start, stop };
}

/**
 * Formats time in seconds to mm:ss format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Formats time in seconds to mm:ss format without milliseconds
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTimeNoMs(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Creates and exports an audio file from the provided audio buffers
 * @param audioBuffers - Array of audio buffers to mix
 * @param offsets - Array of time offsets (in seconds) for each buffer
 * @param duration - Total duration of the export
 * @returns Promise resolving to a Blob of the exported audio
 */
export async function exportAudio(
  audioBuffers: AudioBuffer[],
  offsets: number[],
  duration: number
): Promise<Blob> {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const totalSamples = Math.ceil(duration * sampleRate);
  const mixedBuffer = audioContext.createBuffer(2, totalSamples, sampleRate);
  
  // Mix all audio buffers into one
  for (let i = 0; i < audioBuffers.length; i++) {
    const buffer = audioBuffers[i];
    const offsetSamples = Math.floor(offsets[i] * sampleRate);
    
    for (let channel = 0; channel < Math.min(buffer.numberOfChannels, 2); channel++) {
      const outputData = mixedBuffer.getChannelData(channel);
      const inputData = buffer.getChannelData(channel);
      
      for (let j = 0; j < inputData.length; j++) {
        if (offsetSamples + j < totalSamples) {
          outputData[offsetSamples + j] += inputData[j];
        }
      }
    }
  }
  
  // Normalize the mixed buffer
  for (let channel = 0; channel < mixedBuffer.numberOfChannels; channel++) {
    const data = mixedBuffer.getChannelData(channel);
    let max = 0;
    
    // Find the maximum amplitude
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > max) {
        max = abs;
      }
    }
    
    // Normalize if needed
    if (max > 1) {
      for (let i = 0; i < data.length; i++) {
        data[i] /= max;
      }
    }
  }
  
  // Convert to WAV
  return encodeWAV(mixedBuffer);
}

/**
 * Encodes an AudioBuffer to WAV format
 * @param buffer - The audio buffer to encode
 * @returns Blob containing WAV data
 */
function encodeWAV(buffer: AudioBuffer): Blob {
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
  
  return new Blob([result], { type: 'audio/wav' });
}

function writeUTFBytes(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
