import React from 'react';
import { Canvas } from '@react-three/fiber';
import { AmoraVisualizer } from './AmoraVisualizer';
import { AudioData } from '../hooks/useVoiceClient';
import { MessageLog } from '../types';

interface SceneProps {
  audioRef: React.MutableRefObject<AudioData>;
  isActive: boolean;
  onClick?: () => void;
  setBg?: (bg: { background: string; fill: string }) => void;
  transcripts?: MessageLog[];
}

export const Scene: React.FC<SceneProps> = ({
  audioRef,
  isActive,
  onClick,
  setBg,
  transcripts,
}) => {
  return (
    <Canvas className="canvas" dpr={[1, 2]}>
      <AmoraVisualizer
        audioRef={audioRef}
        isActive={isActive}
        onClick={onClick}
        setBg={setBg}
        transcripts={transcripts}
      />
    </Canvas>
  );
};
