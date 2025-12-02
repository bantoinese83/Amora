import * as THREE from 'three';
import React, { Suspense, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  PerspectiveCamera,
  Environment,
  MeshDistortMaterial,
  ContactShadows,
  OrbitControls,
} from '@react-three/drei';
import { useSpring } from '@react-spring/core';
import { a } from '@react-spring/three';
import { AudioData } from '../hooks/useVoiceClient';
import { MessageLog } from '../types';
import {
  calculateBassEnergy,
  calculateMidEnergy,
  calculateHighEnergy,
} from '../utils/audioAnalysis';

interface AmoraVisualizerProps {
  audioRef: React.MutableRefObject<AudioData>;
  isActive: boolean;
  onClick?: () => void;
  setBg?: (bg: { background: string; fill: string }) => void;
  transcripts?: MessageLog[];
}

const AnimatedMaterial = a(MeshDistortMaterial);

export const AmoraVisualizer: React.FC<AmoraVisualizerProps> = ({
  audioRef,
  isActive,
  onClick,
  setBg,
  transcripts = [],
}) => {
  const [mode, setMode] = useState(false);
  const [down, setDown] = useState(false);
  const [hovered, setHovered] = useState(false);
  const light = useRef<THREE.PointLight>(null);

  // Determine current speaker from transcripts
  const currentSpeaker = transcripts.length > 0 ? transcripts[transcripts.length - 1]?.role : null;
  const isAmoraSpeaking = currentSpeaker === 'assistant';

  // Make the bubble float and follow the mouse
  useFrame(state => {
    if (light.current) {
      light.current.position.x = state.mouse.x * 20;
      light.current.position.y = state.mouse.y * 20;
    }
  });

  // Color: Always purple for Amora
  const amoraColor = '#8b5cf6'; // Purple

  // Springs for color and overall looks
  const [{ wobble, coat, color, ambient, env, distort }] = useSpring(
    {
      wobble: down ? 1.2 : hovered ? 1.05 : isActive ? 1.1 : 1,
      coat: mode && !hovered ? 0.04 : 1,
      ambient: mode && !hovered ? 1.5 : 0.5,
      env: mode && !hovered ? 0.4 : 1,
      color: hovered ? '#a78bfa' : amoraColor,
      distort: isActive ? 0.4 : hovered ? 0.2 : 0.1,
      config: (n: string) => {
        if (n === 'wobble' && hovered) {
          return { mass: 2, tension: 1000, friction: 10 };
        }
        return {};
      },
    },
    [mode, hovered, down, isActive]
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={75}>
        <a.ambientLight intensity={ambient} />
        <a.pointLight ref={light} position-z={-15} intensity={env} color={amoraColor} />
      </PerspectiveCamera>
      <Suspense fallback={null}>
        <AmoraOrb
          audioRef={audioRef}
          isActive={isActive}
          wobble={wobble}
          color={color}
          env={env}
          coat={coat}
          distort={distort}
          isAmoraSpeaking={isAmoraSpeaking}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onPointerDown={() => setDown(true)}
          onPointerUp={() => {
            setDown(false);
            if (onClick) {
              onClick();
            }
            // Toggle mode between dark and bright
            setMode(!mode);
            if (setBg) {
              setBg({
                background: !mode ? '#202020' : '#f0f0f0',
                fill: !mode ? '#f0f0f0' : '#202020',
              });
            }
          }}
        />
        <Environment preset="warehouse" />
        <ContactShadows
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -1.6, 0]}
          opacity={mode ? 0.8 : 0.4}
          width={15}
          height={15}
          blur={2.5}
          far={1.6}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Suspense>
    </>
  );
};

interface AmoraOrbProps {
  audioRef: React.MutableRefObject<AudioData>;
  isActive: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wobble: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  env: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coat: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  distort: any;
  isAmoraSpeaking: boolean;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
}

function AmoraOrb({
  audioRef,
  isActive,
  wobble,
  color,
  env,
  coat,
  distort,
  isAmoraSpeaking,
  onPointerOver,
  onPointerOut,
  onPointerDown,
  onPointerUp,
}: AmoraOrbProps) {
  const sphere = useRef<THREE.Mesh>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materialRef = useRef<any>(null);

  // Smooth audio values - only react when Amora is speaking
  const smoothVolume = useRef(0);
  const smoothBass = useRef(0);
  const smoothMid = useRef(0);
  const smoothHigh = useRef(0);

  // Wave phase tracking for fluid ripple effects
  const wavePhase = useRef(0);
  const bassWavePhase = useRef(0);
  const midWavePhase = useRef(0);
  const highWavePhase = useRef(0);

  // Subtle movement and rotation
  const baseRotation = useRef(0);
  const floatOffset = useRef(0);

  useFrame(state => {
    const time = state.clock.elapsedTime;

    // Only process audio when Amora is speaking
    if (isAmoraSpeaking && isActive) {
      const { volume, data } = audioRef.current;
      const bassEnergy = calculateBassEnergy(data);
      const midEnergy = calculateMidEnergy(data);
      const highEnergy = calculateHighEnergy(data);

      // Smooth audio values with slower, more calculated smoothing
      const smoothingFactor = 0.15; // More subtle smoothing
      smoothVolume.current += (volume - smoothVolume.current) * smoothingFactor;
      smoothBass.current += (bassEnergy - smoothBass.current) * smoothingFactor;
      smoothMid.current += (midEnergy - smoothMid.current) * smoothingFactor;
      smoothHigh.current += (highEnergy - smoothHigh.current) * smoothingFactor;

      // Update wave phases for fluid ripple effects
      // Each frequency band has its own wave phase for layered effects
      const bassSpeed = 0.5 + smoothBass.current * 0.3; // Slower for bass
      const midSpeed = 1.0 + smoothMid.current * 0.5; // Medium speed
      const highSpeed = 1.5 + smoothHigh.current * 0.7; // Faster for high frequencies

      bassWavePhase.current += bassSpeed * 0.02;
      midWavePhase.current += midSpeed * 0.02;
      highWavePhase.current += highSpeed * 0.02;
      wavePhase.current += (0.8 + smoothVolume.current * 0.4) * 0.02;
    } else {
      // When Amora is not speaking, gradually fade out audio reactions
      smoothVolume.current *= 0.95;
      smoothBass.current *= 0.95;
      smoothMid.current *= 0.95;
      smoothHigh.current *= 0.95;

      // Continue gentle wave motion
      wavePhase.current += 0.01;
      bassWavePhase.current += 0.01;
      midWavePhase.current += 0.01;
      highWavePhase.current += 0.01;
    }

    if (sphere.current) {
      // Subtle floating movement - very gentle
      const baseFloat = Math.sin(time / 2.0) * 0.1;
      floatOffset.current += (baseFloat - floatOffset.current) * 0.05;
      sphere.current.position.y = floatOffset.current;

      // Very subtle rotation - slow and calculated
      baseRotation.current += 0.01;
      const rotationInfluence = isAmoraSpeaking ? smoothVolume.current * 0.1 : 0;
      sphere.current.rotation.y = baseRotation.current + rotationInfluence;
      sphere.current.rotation.x = Math.sin(time / 3.0) * 0.1;

      // Subtle scale pulse - very gentle
      const baseScale = 1.0;
      const volumePulse = smoothVolume.current * 0.08; // Much more subtle
      const bassPulse = smoothBass.current * 0.05;
      const scale = baseScale + volumePulse + bassPulse;
      sphere.current.scale.setScalar(scale);
    }

    // Update material properties for wave-like distortion effects
    if (materialRef.current) {
      if (isAmoraSpeaking && isActive) {
        // Create calculated wave distortion based on frequency bands
        // Bass creates slow, deep waves
        const bassWave = Math.sin(bassWavePhase.current) * smoothBass.current * 0.15;
        // Mid creates medium waves
        const midWave = Math.sin(midWavePhase.current * 1.3) * smoothMid.current * 0.12;
        // High creates fast, subtle ripples
        const highWave = Math.sin(highWavePhase.current * 2.0) * smoothHigh.current * 0.08;

        // Combine waves for fluid, layered ripple effect
        const waveDistort = bassWave + midWave + highWave;

        // Base distortion from volume (subtle)
        const volumeDistort = smoothVolume.current * 0.15;

        // Total distortion - calculated and smooth
        const finalDistort = Math.max(0, Math.min(0.4, volumeDistort + waveDistort));

        // Speed: Subtle variation based on audio
        const baseSpeed = 1.0;
        const speedVariation = smoothVolume.current * 0.5 + smoothBass.current * 0.3;
        materialRef.current.speed = baseSpeed + speedVariation;

        materialRef.current.distort = finalDistort;
      } else {
        // Idle state - very subtle, gentle motion
        const idleWave = Math.sin(wavePhase.current) * 0.05;
        materialRef.current.distort = Math.max(0, Math.min(0.2, idleWave + 0.1));
        materialRef.current.speed = 0.8;
      }
    }
  });

  return (
    <>
      {/* Main orb */}
      <a.mesh
        ref={sphere}
        scale={wobble}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Use sphere with more segments for smoother wave effects */}
        <sphereGeometry args={[1, 64, 64]} />
        <AnimatedMaterial
          ref={materialRef}
          color={color}
          envMapIntensity={env}
          clearcoat={coat}
          clearcoatRoughness={0}
          metalness={0.1}
          roughness={0.15}
          distort={distort}
          speed={isActive ? 1.0 : 0.8}
        />
      </a.mesh>
    </>
  );
}
