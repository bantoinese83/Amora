import React, { useEffect, useRef } from 'react';
import { Visualizer } from './Visualizer';
import { ConnectionStatus } from '../types';
import { MicIcon } from './common/Icons';
import { AudioData } from '../hooks/useVoiceClient';
import { calculateBassEnergy } from '../utils/audioAnalysis';

interface VoiceOrbProps {
  status: ConnectionStatus;
  audioRef: React.MutableRefObject<AudioData>;
  onClick: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ status, audioRef, onClick }) => {
  const isConnected = status === ConnectionStatus.CONNECTED;
  const isConnecting = status === ConnectionStatus.CONNECTING;
  const isError = status === ConnectionStatus.ERROR;

  const glowRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Animation loop for fluid reactivity
  useEffect(() => {
    if (!isConnected) {
      // Reset styles when not connected to ensure clean state
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
        glowRef.current.style.transform = 'scale(1)';
      }
      if (orbRef.current) {
        // Clear inline transform so CSS hover effects can work
        orbRef.current.style.transform = '';
        orbRef.current.style.boxShadow = '';
        orbRef.current.style.borderColor = '';
      }
      return;
    }

    const animate = () => {
      const { volume, data } = audioRef.current;

      const bassEnergy = calculateBassEnergy(data);

      // Smooth volume for visuals
      const smoothVol = volume;

      if (glowRef.current) {
        // Outer glow breathes with overall volume
        // Opacity: 0.2 (base) + up to 0.6 based on volume
        glowRef.current.style.opacity = (0.2 + smoothVol * 0.6).toString();

        // Scale: Expands significantly with volume
        // 1.0 to 1.5
        const glowScale = 1 + smoothVol * 0.5;
        glowRef.current.style.transform = `scale(${glowScale})`;
      }

      if (orbRef.current) {
        // Orb creates a tactile "thump" with bass energy
        // Base scale 1.1 (via CSS when connected), but we drive it here for dynamics.
        const baseScale = 1.1;
        const thump = bassEnergy * 0.15;
        orbRef.current.style.transform = `scale(${baseScale + thump})`;

        // Dynamic Shadow / Glow
        // Shift color slightly: Amora Purple (r=139, g=92, b=246) -> lighter/whiter on high energy
        const spread = 10 + bassEnergy * 30;
        const alpha = 0.2 + smoothVol * 0.5;

        orbRef.current.style.boxShadow = `0 0 ${spread}px rgba(139, 92, 246, ${alpha})`;

        // Subtle border pulse
        const borderAlpha = 0.5 + bassEnergy * 0.5;
        orbRef.current.style.borderColor = `rgba(139, 92, 246, ${borderAlpha})`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(rafRef.current);
  }, [isConnected, audioRef]);

  return (
    <div className="relative group flex flex-col items-center justify-center">
      {/* Glow Ring */}
      <div
        ref={glowRef}
        className={`absolute inset-0 bg-amora-500 rounded-full blur-2xl transition-all duration-700 ease-out pointer-events-none ${isConnected ? 'opacity-40' : 'opacity-0 scale-75'}`}
      />

      {/* Main Orb Container */}
      <div
        id="onboarding-orb"
        ref={orbRef}
        onClick={onClick}
        className={`
          w-48 h-48 rounded-full flex items-center justify-center cursor-pointer 
          relative z-10 shadow-2xl overflow-hidden
          transition-all duration-500 ease-out
          ${
            isConnected
              ? 'bg-slate-900/90 border-2 border-amora-500/50 backdrop-blur-sm'
              : 'bg-slate-900 border-4 border-slate-700 hover:border-amora-400/50 hover:scale-105'
          }
          ${isError ? 'border-red-500 shadow-red-500/20' : ''}
        `}
      >
        {/* Layer 1: Mic Icon (Disconnected state) */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${!isConnected && !isConnecting ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
        >
          <div className="text-slate-400 group-hover:text-white transition-colors">
            <MicIcon className="w-16 h-16" />
          </div>
        </div>

        {/* Layer 2: Spinner (Connecting state) */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isConnecting ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>

        {/* Layer 3: Visualizer (Connected state) */}
        <div
          className={`absolute inset-0 w-full h-full p-2 transition-opacity duration-700 ease-in-out ${isConnected ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <Visualizer audioRef={audioRef} isActive={isConnected} />
        </div>
      </div>
    </div>
  );
};
