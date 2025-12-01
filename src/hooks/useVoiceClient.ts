import { useState, useRef, useCallback } from 'react';
import { LiveClient } from '../services/liveClient';
import { ConnectionStatus, MessageLog, AudioChunk } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { updateTranscripts } from '../utils/transcriptUtils';

export interface AudioData {
  volume: number;
  data: Uint8Array;
}

export function useVoiceClient() {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isMuted, setIsMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<MessageLog[]>([]);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const sessionStartTimeRef = useRef<number>(0);

  // Performance Optimization: Use Ref for high-frequency audio data (60fps)
  // This prevents the entire React tree from re-rendering every frame.
  const audioDataRef = useRef<AudioData>({ volume: 0, data: new Uint8Array(0) });

  const liveClientRef = useRef<LiveClient | null>(null);

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus as ConnectionStatus);
  }, []);

  const handleAudioUpdate = useCallback((vol: number, data: Uint8Array) => {
    // Direct mutation of ref - no render trigger
    audioDataRef.current = { volume: vol, data };
  }, []);

  const handleTranscription = useCallback((text: string, isUser: boolean) => {
    setTranscripts(prev => updateTranscripts(prev, text, isUser));
  }, []);

  const handleAudioChunk = useCallback((base64Audio: string, role: 'user' | 'assistant') => {
    const timestamp = Date.now() - sessionStartTimeRef.current;
    setAudioChunks(prev => [...prev, { audio: base64Audio, role, timestamp }]);
  }, []);

  const connect = useCallback(
    async (ragStoreName?: string | null, voiceName: string = 'Kore') => {
      if (liveClientRef.current) {
        await liveClientRef.current.disconnect();
      }

      setTranscripts([]);
      setAudioChunks([]); // Reset audio chunks on new connection
      sessionStartTimeRef.current = Date.now(); // Track session start time

      liveClientRef.current = new LiveClient(
        handleStatusChange,
        handleAudioUpdate,
        handleTranscription,
        handleAudioChunk
      );

      // Inject configuration
      await liveClientRef.current.connect({
        model: MODEL_NAME,
        systemInstruction: SYSTEM_INSTRUCTION,
        voiceName: voiceName,
        ...(ragStoreName ? { fileSearchStoreName: ragStoreName } : {}),
      });
    },
    [handleStatusChange, handleAudioUpdate, handleTranscription, handleAudioChunk]
  );

  const disconnect = useCallback(async () => {
    if (liveClientRef.current) {
      await liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    // Don't clear audioChunks here - they're needed for session save
  }, []);

  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    liveClientRef.current?.toggleMute(newMuteState);
  }, [isMuted]);

  return {
    status,
    audioDataRef,
    isMuted,
    transcripts,
    audioChunks,
    connect,
    disconnect,
    toggleMute,
  };
}
