import React, { useEffect, useRef } from 'react';
import { AudioData } from '../hooks/useVoiceClient';
import { ConnectionStatus } from '../types';

interface BackgroundGlowProps {
  audioRef: React.MutableRefObject<AudioData>;
  status: ConnectionStatus;
}

export const BackgroundGlow: React.FC<BackgroundGlowProps> = ({ audioRef, status }) => {
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Determine base color based on status
  const getBaseColorClass = () => {
    switch (status) {
      case ConnectionStatus.CONNECTING:
        return 'bg-amber-500/30'; // Warm yellow for connecting
      case ConnectionStatus.CONNECTED:
        return 'bg-amora-600/30'; // Deep purple for active
      case ConnectionStatus.ERROR:
        return 'bg-red-600/20'; // Red for error
      case ConnectionStatus.DISCONNECTED:
      default:
        return 'bg-amora-900/20'; // Subtle dark purple for idle
    }
  };

  useEffect(() => {
    const animate = () => {
      if (glowRef.current) {
        const time = Date.now() / 1000;
        let scale = 1;
        let opacity = 0.2;

        switch (status) {
          case ConnectionStatus.CONNECTED:
            // Audio Reactive
            const volume = audioRef.current.volume;
            scale = 1 + volume * 0.4;
            opacity = 0.3 + volume * 0.5;
            break;

          case ConnectionStatus.CONNECTING:
            // Fast Pulse
            scale = 1 + Math.sin(time * 3) * 0.15;
            opacity = 0.4 + Math.sin(time * 3) * 0.2;
            break;

          case ConnectionStatus.ERROR:
            // Static / Slow uneasy breath
            scale = 1 + Math.sin(time) * 0.05;
            opacity = 0.3;
            break;

          case ConnectionStatus.DISCONNECTED:
          default:
            // Slow Idle Breath
            scale = 1 + Math.sin(time * 0.5) * 0.05;
            opacity = 0.2 + Math.sin(time * 0.5) * 0.1;
            break;
        }

        // Apply styles directly for performance
        glowRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
        glowRef.current.style.opacity = opacity.toString();
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(rafRef.current);
  }, [audioRef, status]);

  return (
    <div
      ref={glowRef}
      className={`
        absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none 
        transition-colors duration-1000 ease-in-out will-change-transform
        ${getBaseColorClass()}
      `}
      style={{ transform: 'translate(-50%, -50%)' }}
    />
  );
};
