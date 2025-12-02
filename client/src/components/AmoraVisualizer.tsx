import * as THREE from 'three';
import React, { Suspense, useEffect, useState, useRef } from 'react';
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
import { calculateBassEnergy, calculateMidEnergy, calculateHighEnergy } from '../utils/audioAnalysis';

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
  const rippleLight = useRef<THREE.PointLight>(null);

  // Determine current speaker from transcripts
  const currentSpeaker = transcripts.length > 0 ? transcripts[transcripts.length - 1]?.role : null;
  const isUserSpeaking = currentSpeaker === 'user';
  const isAmoraSpeaking = currentSpeaker === 'assistant';

  // Change cursor on hovered state
  useEffect(() => {
    document.body.style.cursor = hovered
      ? 'none'
      : `url('data:image/svg+xml;base64,${btoa(
          '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="10" fill="#8b5cf6"/></svg>'
        )}'), auto`;
  }, [hovered]);

  // Make the bubble float and follow the mouse
  useFrame((state) => {
    if (light.current) {
      light.current.position.x = state.mouse.x * 20;
      light.current.position.y = state.mouse.y * 20;
    }
    if (rippleLight.current) {
      rippleLight.current.position.x = state.mouse.x * 15;
      rippleLight.current.position.y = state.mouse.y * 15;
    }
  });

  // Color schemes: Purple for Amora, Cyan/Teal for User
  const amoraColor = '#8b5cf6'; // Purple
  const userColor = '#06b6d4'; // Cyan/Teal
  const baseColor = isUserSpeaking ? userColor : isAmoraSpeaking ? amoraColor : amoraColor;

  // Springs for color and overall looks
  const [{ wobble, coat, color, ambient, env, envRipple, distort }] = useSpring(
    {
      wobble: down ? 1.2 : hovered ? 1.05 : isActive ? 1.1 : 1,
      coat: mode && !hovered ? 0.04 : 1,
      ambient: mode && !hovered ? 1.5 : 0.5,
      env: mode && !hovered ? 0.4 : 1,
      envRipple: mode && !hovered ? 0.2 : 0.5,
      color: hovered ? '#a78bfa' : baseColor,
      distort: isActive ? 0.4 : hovered ? 0.2 : 0.1,
      config: (n: string) => {
        if (n === 'wobble' && hovered) {
          return { mass: 2, tension: 1000, friction: 10 };
        }
        return {};
      },
    },
    [mode, hovered, down, isActive, baseColor]
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={75}>
        <a.ambientLight intensity={ambient} />
        <a.pointLight ref={light} position-z={-15} intensity={env} color={baseColor} />
        <a.pointLight ref={rippleLight} position-z={-10} intensity={envRipple} color={baseColor} />
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
          isUserSpeaking={isUserSpeaking}
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
              setBg({ background: !mode ? '#202020' : '#f0f0f0', fill: !mode ? '#f0f0f0' : '#202020' });
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
        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} />
      </Suspense>
    </>
  );
};

interface AmoraOrbProps {
  audioRef: React.MutableRefObject<AudioData>;
  isActive: boolean;
  wobble: any;
  color: any;
  env: any;
  coat: any;
  distort: any;
  isUserSpeaking: boolean;
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
  isUserSpeaking,
  isAmoraSpeaking,
  onPointerOver,
  onPointerOut,
  onPointerDown,
  onPointerUp,
}: AmoraOrbProps) {
  const sphere = useRef<THREE.Mesh>(null);
  const ripple1 = useRef<THREE.Mesh>(null);
  const ripple2 = useRef<THREE.Mesh>(null);
  const ripple3 = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const smoothVolume = useRef(0);
  const smoothBass = useRef(0);
  const smoothMid = useRef(0);
  const smoothHigh = useRef(0);
  const glitchAmount = useRef(0);
  const rippleIntensity = useRef(0);
  const morphTarget = useRef(0);
  const rotationSpeed = useRef(0);
  const lastGlitchTime = useRef(0);

  useFrame((state) => {
    const { volume, data } = audioRef.current;
    const bassEnergy = calculateBassEnergy(data);
    const midEnergy = calculateMidEnergy(data);
    const highEnergy = calculateHighEnergy(data);

    // Smooth audio values with different speeds for different frequencies
    smoothVolume.current += (volume - smoothVolume.current) * 0.25;
    smoothBass.current += (bassEnergy - smoothBass.current) * 0.3;
    smoothMid.current += (midEnergy - smoothMid.current) * 0.25;
    smoothHigh.current += (highEnergy - smoothHigh.current) * 0.2;

    // Calculate glitch amount based on high frequencies (more glitchy on sharp sounds)
    glitchAmount.current += (highEnergy * 3 - glitchAmount.current) * 0.4;

    // Ripple intensity based on overall volume - much more reactive
    rippleIntensity.current += (smoothVolume.current * 5 - rippleIntensity.current) * 0.3;

    // Morph target based on who's speaking and audio characteristics
    if (isUserSpeaking) {
      // User: More angular, sharper shapes, faster rotation
      morphTarget.current += (0.9 + smoothHigh.current * 0.5 - morphTarget.current) * 0.2;
      rotationSpeed.current += (smoothVolume.current * 3 - rotationSpeed.current) * 0.15;
    } else if (isAmoraSpeaking) {
      // Amora: More fluid, smoother shapes, gentler rotation
      morphTarget.current += (0.2 + smoothBass.current * 0.6 - morphTarget.current) * 0.2;
      rotationSpeed.current += (smoothVolume.current * 2 - rotationSpeed.current) * 0.15;
    } else {
      // Idle: Gentle morphing
      morphTarget.current += (0.5 - morphTarget.current) * 0.1;
      rotationSpeed.current += (0.1 - rotationSpeed.current) * 0.1;
    }

    const time = state.clock.elapsedTime;

    if (sphere.current) {
      // Position: Float and react to audio with more movement
      const floatY = Math.sin(time / 1.2) / 5 + smoothVolume.current * 0.6;
      const floatX = Math.cos(time / 1.8) / 8 + smoothMid.current * 0.3;
      sphere.current.position.y = THREE.MathUtils.lerp(sphere.current.position.y, floatY, 0.25);
      sphere.current.position.x = THREE.MathUtils.lerp(sphere.current.position.x, floatX, 0.2);

      // Rotation: Spin based on audio and speaker - much more dynamic
      const baseRotation = time * rotationSpeed.current;
      const audioRotationX = smoothBass.current * Math.PI;
      const audioRotationY = smoothMid.current * Math.PI * 0.7;
      const audioRotationZ = smoothHigh.current * Math.PI * 0.5;

      sphere.current.rotation.x = baseRotation * 0.4 + audioRotationX;
      sphere.current.rotation.y = baseRotation * 0.6 + audioRotationY;
      sphere.current.rotation.z = baseRotation * 0.3 + audioRotationZ;

      // Scale: Pulse with audio - more dramatic
      const baseScale = 1.0;
      const volumePulse = smoothVolume.current * 0.4;
      const bassThump = smoothBass.current * 0.3;
      const midPulse = smoothMid.current * 0.2;
      const scale = baseScale + volumePulse + bassThump + midPulse;
      sphere.current.scale.setScalar(scale);
    }

    // Ripple effects - expanding rings
    const rippleSpeed = 0.8;
    const rippleScale = 1.0 + rippleIntensity.current * 2;
    const rippleOpacity = Math.max(0, 1 - rippleIntensity.current * 0.8);

    if (ripple1.current) {
      const progress1 = (time * rippleSpeed) % 1;
      ripple1.current.scale.setScalar(1 + progress1 * rippleScale);
      if (ripple1.current.material instanceof THREE.MeshBasicMaterial) {
        ripple1.current.material.opacity = rippleOpacity * (1 - progress1);
      }
    }

    if (ripple2.current) {
      const progress2 = ((time * rippleSpeed + 0.33) % 1);
      ripple2.current.scale.setScalar(1 + progress2 * rippleScale);
      if (ripple2.current.material instanceof THREE.MeshBasicMaterial) {
        ripple2.current.material.opacity = rippleOpacity * (1 - progress2);
      }
    }

    if (ripple3.current) {
      const progress3 = ((time * rippleSpeed + 0.66) % 1);
      ripple3.current.scale.setScalar(1 + progress3 * rippleScale);
      if (ripple3.current.material instanceof THREE.MeshBasicMaterial) {
        ripple3.current.material.opacity = rippleOpacity * (1 - progress3);
      }
    }

    // Update material properties for morphing and glitch effects
    if (materialRef.current) {
      // Distortion based on audio and morph target - much more reactive
      const audioDistort = smoothVolume.current * 0.8 + smoothBass.current * 0.6 + smoothMid.current * 0.4;
      const morphDistort = morphTarget.current * 0.4;
      let finalDistort = audioDistort + morphDistort;

      // Speed: Faster when active, varies with audio
      materialRef.current.speed = isActive ? 3 + smoothVolume.current * 3 + smoothBass.current * 2 : 1;

      // Glitch effect: Random distortion spikes when high frequencies are strong
      if (glitchAmount.current > 0.2 && time - lastGlitchTime.current > 0.1) {
        const glitch = (Math.random() - 0.5) * glitchAmount.current * 0.3;
        finalDistort += glitch;
        lastGlitchTime.current = time;
      }

      materialRef.current.distort = Math.max(0, Math.min(1, finalDistort));
    }
  });

  const rippleColor = isUserSpeaking ? '#06b6d4' : '#8b5cf6';

  return (
    <group>
      {/* Ripple effects - expanding rings */}
      <mesh ref={ripple1}>
        <ringGeometry args={[1.1, 1.2, 32]} />
        <meshBasicMaterial color={rippleColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ripple2}>
        <ringGeometry args={[1.1, 1.2, 32]} />
        <meshBasicMaterial color={rippleColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ripple3}>
        <ringGeometry args={[1.1, 1.2, 32]} />
        <meshBasicMaterial color={rippleColor} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Main orb */}
      <a.mesh
        ref={sphere}
        scale={wobble}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* Use icosahedron for more interesting morphing potential */}
        <icosahedronGeometry args={[1, 4]} />
        <AnimatedMaterial
          ref={materialRef}
          color={color}
          envMapIntensity={env}
          clearcoat={coat}
          clearcoatRoughness={0}
          metalness={isUserSpeaking ? 0.4 : isAmoraSpeaking ? 0.1 : 0.1}
          roughness={isUserSpeaking ? 0.25 : isAmoraSpeaking ? 0.1 : 0.2}
          distort={distort}
          speed={isActive ? 2 : 1}
        />
      </a.mesh>
    </group>
  );
}
