import React, { useEffect, useRef } from 'react';
import { AudioData } from '../hooks/useVoiceClient';

interface VisualizerProps {
  audioRef: React.MutableRefObject<AudioData>;
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ audioRef, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      const { volume, data } = audioRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Update phase for rotation
      phaseRef.current += 0.015;

      if (!isActive) {
        // Idle state - subtle breathing circle
        const idleRadius = 30 + Math.sin(Date.now() / 2000) * 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, idleRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 58, 237, 0.15)'; // amora-600 low opacity
        ctx.fill();
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Active Waveform Generation
        const radius = 45;

        // Optimized: Map directly from source data to avoid array allocation in render loop
        // Use 75% of frequency bins (concentrated low freqs)
        const relevantLen = Math.floor(data.length * 0.75);
        const totalPoints = relevantLen * 2; // Mirrored

        if (relevantLen > 0) {
          // Use a non-linear curve for volume to ensure quiet sounds are visible
          // while loud sounds don't overwhelm the visual.
          // Power < 1 lifts low values (e.g. 0.1^0.7 ≈ 0.2)
          const visualVol = Math.pow(volume, 0.7);

          ctx.beginPath();

          // 2. Dynamic Line Thickness
          // Scales from 1px to 5px based on visual volume
          ctx.lineWidth = 1 + visualVol * 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const alpha = 0.4 + visualVol * 0.6; // Range 0.4 - 1.0
          ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`; // amora-400
          ctx.fillStyle = `rgba(139, 92, 246, ${0.1 + visualVol * 0.2})`; // amora-500

          for (let i = 0; i <= totalPoints; i++) {
            // Map index to angle
            const angle = (i / totalPoints) * Math.PI * 2 + phaseRef.current;

            // Mirror logic: [0...len-1, len-1...0]
            let virtualIndex = i % totalPoints;
            let dataIndex = virtualIndex;
            if (dataIndex >= relevantLen) {
              dataIndex = totalPoints - 1 - dataIndex;
            }

            // Safety clamp
            if (dataIndex < 0) dataIndex = 0;
            if (dataIndex >= data.length) dataIndex = data.length - 1;

            const val = data[dataIndex];
            if (val === undefined) continue;

            // 3. Visual Boost
            const normalizedVal = val / 255;

            // Apply power curve to bin value to sharpen spikes
            const binBoost = Math.pow(normalizedVal, 1.5);

            // Scale offset based on both specific bin value and overall volume
            // Quiet sounds (visualVol low) still get some range (20), loud sounds get more (80)
            const offset = binBoost * (20 + visualVol * 60);

            const r = radius + offset;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Inner core pulse
          ctx.beginPath();
          ctx.arc(centerX, centerY, 25 + visualVol * 20, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + visualVol * 0.2})`;
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive, audioRef]);

  return <canvas ref={canvasRef} className="w-full h-full rounded-full" />;
};
