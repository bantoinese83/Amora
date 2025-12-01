import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import { decode, decodeAudioData, createAudioContext } from '../../utils/audioUtils';
import { SAMPLE_RATE_OUTPUT, SAMPLE_RATE_INPUT } from '../../constants';
import { AudioChunk } from '../../types';

interface AudioPlayerProps {
  audioChunks: AudioChunk[];
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioChunks, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Silent fail for audio context cleanup
        });
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      sourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch {
          // Ignore errors
        }
      });
    };
  }, []);

  const loadAudio = async (): Promise<{ buffers: AudioBuffer[]; totalDuration: number }> => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext({
        sampleRate: SAMPLE_RATE_OUTPUT,
        latencyHint: 'interactive',
      });
    }

    const ctx = audioContextRef.current;
    const buffers: AudioBuffer[] = [];
    let totalDuration = 0;

    // Sort chunks by timestamp to maintain conversation order
    const sortedChunks = [...audioChunks].sort((a, b) => a.timestamp - b.timestamp);

    for (const chunk of sortedChunks) {
      // Both user and assistant audio are in PCM format
      // User audio is captured from the same stream and converted to PCM
      const buffer = await decodeAudioData(
        decode(chunk.audio),
        ctx,
        chunk.role === 'user' ? SAMPLE_RATE_INPUT : SAMPLE_RATE_OUTPUT,
        1
      );
      buffers.push(buffer);
      totalDuration += buffer.duration;
    }

    return { buffers, totalDuration };
  };

  const playAudio = async () => {
    if (isPlaying || audioChunks.length === 0) return;

    setIsLoading(true);
    try {
      const { buffers, totalDuration } = await loadAudio();
      setDuration(totalDuration);

      if (!audioContextRef.current) return;

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const startTime = ctx.currentTime - currentTime;
      startTimeRef.current = startTime;

      let accumulatedTime = 0;
      sourcesRef.current = [];

      for (const buffer of buffers) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        source.start(startTime + accumulatedTime);
        accumulatedTime += buffer.duration;

        source.addEventListener('ended', () => {
          sourcesRef.current = sourcesRef.current.filter(s => s !== source);
          if (sourcesRef.current.length === 0) {
            setIsPlaying(false);
            setCurrentTime(0);
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
          }
        });

        sourcesRef.current.push(source);
      }

      setIsPlaying(true);
      setIsLoading(false);

      // Update current time
      const updateTime = () => {
        if (!audioContextRef.current || !isPlaying) return;

        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        if (elapsed >= 0 && elapsed <= totalDuration) {
          setCurrentTime(elapsed);
          animationFrameRef.current = requestAnimationFrame(updateTime);
        } else {
          setIsPlaying(false);
          setCurrentTime(totalDuration);
        }
      };

      updateTime();
    } catch {
      // Error is handled by UI state (isLoading set to false)
      // No need to log - user will see the error state
      setIsLoading(false);
    }
  };

  const pauseAudio = () => {
    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {
        // Ignore errors
      }
    });
    sourcesRef.current = [];
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleToggle = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (audioChunks.length === 0) {
    return null;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-slate-800/50 rounded-xl p-3 ${className}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-amora-500 hover:bg-amora-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <PauseIcon className="w-5 h-5 text-white" />
          ) : (
            <PlayIcon className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="text-[10px]">{formatTime(currentTime)}</span>
            <span className="text-[10px]">{formatTime(duration)}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amora-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
