/**
 * LiquidVoidCircle — Architectural Apple visionOS Minimalist Audio Visualizer
 *
 * Design Spec & Philosophy:
 *  - 100% Minimalist: Rotating 1.5px conic-gradient light ring + Abyssal Void core (#05070E)
 *  - Hairline precision (0.75px - 1.5px) via WebkitMask
 *  - Zero-noise transparent halo (subtle 6-10px drop-shadow, max 0.3 opacity)
 *  - Kick-centric physical elastic spring rebound (stiffness: 180, damping: 12)
 *  - Optional subtle peripheral ear-like shapes (Cat-Ears, Fox-Ears, Cyber-Horns, Valkyrie-Wings, Laser-Crown)
 *    DISABLED by default to preserve pure minimalism
 *  - Apple visionOS glass panel with Pro Mode toggle
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer';
import { usePlayerStore } from '../../stores/playerStore';
import {
  Sliders,
  Sparkles,
  Disc3,
  RotateCcw,
  X,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export type PeripheralShapeType =
  | 'dual_crest'
  | 'vector_spires'
  | 'pulse_antennas'
  | 'aero_fins'
  | 'apex_prism'
  | 'harmonic_crown'
  | 'hyperbolic_arcs'
  | 'laser_needles'
  | 'fractal'
  | 'wave_peaks'
  | 'cat_ears'
  | 'fox_ears'
  | 'cyber_horns'
  | 'valkyrie_wings'
  | 'laser_crown'
  | 'cyber_hexagon'
  | 'octagram_star'
  | 'phoenix_wings'
  | 'quantum_gyro'
  | 'lotus_mandala'
  | 'radar_heartbeat';

export type SacredPaletteType = 'neon' | 'gold' | 'crystal' | 'lucid';

interface LiquidVoidCircleProps {
  scaleFactor?: number;
  centerLogo?: React.ReactNode;
}

const PERIPHERAL_SHAPES: { id: PeripheralShapeType; name: string; desc: string }[] = [
  { id: 'dual_crest', name: 'Cresta Dual', desc: '2 crestas afiladas simétricas a ±45°' },
  { id: 'vector_spires', name: 'Agujas Vectoriales', desc: 'Picos esbeltos con micro-nodos radiantes' },
  { id: 'pulse_antennas', name: 'Antenas de Pulso', desc: 'Doble contorno con resonancia armónica' },
  { id: 'aero_fins', name: 'Aletas Aerodinámicas', desc: 'Aletas laterales escalonadas en los flancos' },
  { id: 'apex_prism', name: 'Prisma de Ápice', desc: 'Crestas triangulares puras de alta tensión' },
  { id: 'harmonic_crown', name: 'Corona Armónica', desc: 'Cruz simétrica de 4 crestas perpendiculares' },
  { id: 'hyperbolic_arcs', name: 'Arcos Hiperbólicos', desc: 'Curvas con barrido polar y deflexión' },
  { id: 'laser_needles', name: 'Agujas Láser Hairline', desc: 'Líneas ultrafinas de 0.75px con destello' },
  { id: 'fractal', name: 'Mándala Sagrada', desc: 'Geometría fractal de pétalos armónicos' },
  { id: 'wave_peaks', name: 'Halo de Ondas Reactivas', desc: 'Halo orbital con picos ondulantes que viajan con el ritmo' },
  { id: 'cyber_hexagon', name: 'Hexágono Cyber', desc: 'Polígono hex con cada lado reactivo a una banda FFT' },
  { id: 'octagram_star', name: 'Estrella 8 Puntas', desc: 'Estrella con alternancia sinusoidal interior/exterior' },
  { id: 'phoenix_wings', name: 'Alas Fénix', desc: 'Perfil Joukowski asimétrico que se abre con la energía' },
  { id: 'quantum_gyro', name: 'Giroscopio Cuántico', desc: 'Lissajous polar a=3 b=2 con interferencia Moiré' },
  { id: 'lotus_mandala', name: 'Mandala Loto', desc: 'Curva rosa k=5: 10 pétalos reactivos a bajos/mids' },
  { id: 'radar_heartbeat', name: 'Radar EKG', desc: 'Barrido de radar con pulso cardíaco QRS' },
];

export const LiquidVoidCircle: React.FC<LiquidVoidCircleProps> = ({
  scaleFactor = 1.0,
  centerLogo,
}) => {
  const {
    blobSettings,
    updateBlobSettings,
    musicSensitivity,
    isPlaying,
    isMicActive,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    dynamicColor,
  } = usePlayerStore();

  const { getSmoothedData } = useVisualizer(0.2);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  // Settings
  const showPeripheral = blobSettings.showPeripheralShapes ?? false;
  const peripheralType = blobSettings.peripheralShapeType ?? 'cat_ears';
  const peripheralCount = blobSettings.peripheralShapeCount ?? 2;
  const strokeHairline = blobSettings.strokeHairline ?? 1.5;
  const kickIntensity = blobSettings.kickIntensity ?? 1.0;
  const palette = (blobSettings.sacredPalette as SacredPaletteType) ?? 'neon';
  const isProMode = blobSettings.isAdvancedMode ?? false;

  // Spring physics state for the Kick
  const springRef = useRef({
    displacement: 0,
    velocity: 0,
    prevBass: 0,
  });

  // Morphing interpolator for shape transitions (400ms lerp)
  const morphProgressRef = useRef(1.0);
  const currentShapeRef = useRef<PeripheralShapeType>(peripheralType);
  const targetShapeRef = useRef<PeripheralShapeType>(peripheralType);

  useEffect(() => {
    if (targetShapeRef.current !== peripheralType) {
      currentShapeRef.current = targetShapeRef.current;
      targetShapeRef.current = peripheralType;
      morphProgressRef.current = 0.0;
    }
  }, [peripheralType]);

  // Smoothed audio refs (EMA filter 0.28)
  const smoothedBassRef = useRef(0);
  const smoothedMidsRef = useRef(0);
  const smoothedEnergyRef = useRef(0);

  // Colors based on palette
  const ringColors = useMemo(() => {
    switch (palette) {
      case 'gold':
        return {
          conic: 'conic-gradient(from 0deg, #E2C889, #FFF2CE, #B8974F, #E2C889)',
          glow: 'rgba(226, 200, 137, 0.25)',
          stroke: '#E2C889',
          accent: '#FFF2CE',
        };
      case 'crystal':
        return {
          conic: 'conic-gradient(from 0deg, #FFFFFF, #C8D1DC, #9AA7B6, #FFFFFF)',
          glow: 'rgba(255, 255, 255, 0.25)',
          stroke: '#FFFFFF',
          accent: '#C8D1DC',
        };
      case 'lucid':
        const p = isLucid ? (lucidPrimaryColor || lucidTheme.primary) : (dynamicColor || '#00F0FF');
        const s = isLucid ? (lucidTheme.secondary || '#8C38FF') : '#FF0D8D';
        return {
          conic: `conic-gradient(from 0deg, ${p}, ${s}, ${p})`,
          glow: isLucid ? lucidTheme.glow : 'rgba(0, 240, 255, 0.25)',
          stroke: p,
          accent: s,
        };
      case 'neon':
      default:
        return {
          conic: 'conic-gradient(from 0deg, #00F0FF, #8C38FF, #FF0D8D, #00F0FF)',
          glow: 'rgba(0, 240, 255, 0.25)',
          stroke: '#00F0FF',
          accent: '#8C38FF',
        };
    }
  }, [palette, isLucid, lucidTheme, lucidPrimaryColor, dynamicColor]);

  // Main 60 FPS requestAnimationFrame Loop
  useEffect(() => {
    let animId: number;
    let continuousAngle = 0;

    const render = () => {
      const now = performance.now();
      const timeSec = now * 0.001;
      const u = scaleFactor;

      const { bass, mids, energy, raw } = getSmoothedData();
      const audioSens = musicSensitivity ?? 1.0;
      const isAudioActive = energy > 0.005 || isPlaying || isMicActive;

      // Exponential moving average filter (EMA 0.28)
      const effectiveBass = bass * audioSens;
      const effectiveMids = mids * audioSens;
      const effectiveEnergy = energy * audioSens;

      smoothedBassRef.current += (effectiveBass - smoothedBassRef.current) * 0.28;
      smoothedMidsRef.current += (effectiveMids - smoothedMidsRef.current) * 0.28;
      smoothedEnergyRef.current += (effectiveEnergy - smoothedEnergyRef.current) * 0.28;

      const sBass = smoothedBassRef.current;
      const sMids = smoothedMidsRef.current;
      const sEnergy = smoothedEnergyRef.current;

      // Continuous rotation: 16s per turn (0.392 rad/s in play, 0.015 rad/s in idle)
      if (isAudioActive) {
        continuousAngle += 0.35 + sBass * 0.15;
      } else {
        continuousAngle += 0.09; // idle rotation
      }

      // ── Kick Detection & Spring Damping (stiffness: 180, damping: 12) ──
      const kickThresh = 0.32;
      const bassDelta = sBass - springRef.current.prevBass;
      springRef.current.prevBass = sBass;

      if (isAudioActive && sBass > kickThresh && bassDelta > 0.035) {
        // Inject physical impulse
        springRef.current.velocity += Math.min(0.28, bassDelta * kickIntensity * 1.6);
      }

      // Spring integration
      const dt = 0.016;
      const stiffness = 180;
      const damping = 12;
      const springForce = -stiffness * springRef.current.displacement - damping * springRef.current.velocity;
      springRef.current.velocity += springForce * dt;
      springRef.current.displacement += springRef.current.velocity * dt;
      if (springRef.current.displacement < 0) springRef.current.displacement = 0;

      // Elastic expansion: up to +12%
      const kickRebound = springRef.current.displacement * 0.12;
      const idleBreathing = isAudioActive ? 0 : Math.sin(timeSec * 1.5) * 0.03;
      const globalScale = 1.0 + kickRebound + idleBreathing;

      // Update Ring element style
      if (ringRef.current) {
        ringRef.current.style.transform = `scale(${globalScale}) rotate(${continuousAngle}deg)`;
        // Subtle drop-shadow brightness modulation (opacity 0.20 to 0.30 max)
        const shadowOpacity = Math.min(0.30, 0.20 + sEnergy * 0.10);
        ringRef.current.style.filter = `drop-shadow(0 0 ${Math.round(8 * u)}px ${ringColors.glow.replace(/[\d\.]+\)$/, `${shadowOpacity})`)}`;
      }

      // Update Core Void style
      if (coreRef.current) {
        coreRef.current.style.transform = `scale(${globalScale})`;
      }

      // ── Render Optional Peripheral Shapes on Canvas 2D ──
      const canvas = canvasRef.current;
      if (canvas && showPeripheral) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const size = Math.round(520 * u);
          ctx.save();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, size, size);

          const cx = size / 2;
          const cy = size / 2;
          const baseRadius = ((blobSettings.circleSize || 179) / 2) * u * 0.5 * globalScale;

          // Progress morphing
          if (morphProgressRef.current < 1.0) {
            morphProgressRef.current = Math.min(1.0, morphProgressRef.current + 0.04);
          }

          // Slow counter-rotation: -0.3 rad/s
          const counterAngle = -timeSec * 0.30;
          const stretch = blobSettings.crestStretch ?? 1.0;
          const bassPunch = blobSettings.crestBassBoost ?? 1.6;
          const noteFactor = blobSettings.crestNoteMovement ?? 1.0;
          const earAmp = (14 + (sMids * 36 + sEnergy * 28 * noteFactor) * (1 + sBass * 0.70 * bassPunch)) * stretch * u;

          // Evaluator for polar radius of each shape
          const evaluateShapeRadius = (type: PeripheralShapeType, theta: number): number => {
            const rotTheta = theta + counterAngle;

            switch (type) {
              case 'dual_crest':
              case 'cat_ears': {
                // Symmetrical Dual Crests on top-left and top-right (±45 deg)
                const ear1 = Math.PI * 0.25;
                const ear2 = Math.PI * 0.75;
                const d1 = Math.abs(Math.atan2(Math.sin(rotTheta - ear1), Math.cos(rotTheta - ear1)));
                const d2 = Math.abs(Math.atan2(Math.sin(rotTheta - ear2), Math.cos(rotTheta - ear2)));
                const earWidth = 0.45;
                const factor1 = d1 < earWidth ? Math.pow(Math.cos((d1 / earWidth) * (Math.PI / 2)), 2.4) : 0;
                const factor2 = d2 < earWidth ? Math.pow(Math.cos((d2 / earWidth) * (Math.PI / 2)), 2.4) : 0;
                return (factor1 + factor2) * earAmp;
              }

              case 'vector_spires':
              case 'fox_ears': {
                // Convergent slender vector spires with high power exponent
                const ear1 = Math.PI * 0.28;
                const ear2 = Math.PI * 0.72;
                const d1 = Math.abs(Math.atan2(Math.sin(rotTheta - ear1), Math.cos(rotTheta - ear1)));
                const d2 = Math.abs(Math.atan2(Math.sin(rotTheta - ear2), Math.cos(rotTheta - ear2)));
                const earWidth = 0.35;
                const factor1 = d1 < earWidth ? Math.pow(Math.cos((d1 / earWidth) * (Math.PI / 2)), 3.0) : 0;
                const factor2 = d2 < earWidth ? Math.pow(Math.cos((d2 / earWidth) * (Math.PI / 2)), 3.0) : 0;
                return (factor1 + factor2) * (earAmp * 1.35);
              }

              case 'pulse_antennas': {
                // Slender dual peaks with harmonic contour
                const ear1 = Math.PI * 0.30;
                const ear2 = Math.PI * 0.70;
                const d1 = Math.abs(Math.atan2(Math.sin(rotTheta - ear1), Math.cos(rotTheta - ear1)));
                const d2 = Math.abs(Math.atan2(Math.sin(rotTheta - ear2), Math.cos(rotTheta - ear2)));
                const w = 0.38;
                const f1 = d1 < w ? Math.pow(Math.cos((d1 / w) * (Math.PI / 2)), 2.6) * (1 + 0.25 * Math.cos(d1 * 10)) : 0;
                const f2 = d2 < w ? Math.pow(Math.cos((d2 / w) * (Math.PI / 2)), 2.6) * (1 + 0.25 * Math.cos(d2 * 10)) : 0;
                return (f1 + f2) * (earAmp * 1.22);
              }

              case 'hyperbolic_arcs':
              case 'cyber_horns': {
                // Swept-back hyperbolic arcs with tangential tension
                const horn1 = Math.PI * 0.20;
                const horn2 = Math.PI * 0.80;
                const d1 = Math.abs(Math.atan2(Math.sin(rotTheta - horn1), Math.cos(rotTheta - horn1)));
                const d2 = Math.abs(Math.atan2(Math.sin(rotTheta - horn2), Math.cos(rotTheta - horn2)));
                const hornWidth = 0.50;
                const factor1 = d1 < hornWidth ? Math.pow(Math.cos((d1 / hornWidth) * (Math.PI / 2)), 2.0) : 0;
                const factor2 = d2 < hornWidth ? Math.pow(Math.cos((d2 / hornWidth) * (Math.PI / 2)), 2.0) : 0;
                return (factor1 + factor2) * (earAmp * 1.15);
              }

              case 'aero_fins':
              case 'valkyrie_wings': {
                // Aerodynamic lateral fins on flanks
                const wingL = Math.PI;
                const wingR = 0;
                const d1 = Math.abs(Math.atan2(Math.sin(rotTheta - wingL), Math.cos(rotTheta - wingL)));
                const d2 = Math.abs(Math.atan2(Math.sin(rotTheta - wingR), Math.cos(rotTheta - wingR)));
                const wingWidth = 0.65;
                const factor1 = d1 < wingWidth ? Math.pow(Math.cos((d1 / wingWidth) * (Math.PI / 2)), 1.8) : 0;
                const factor2 = d2 < wingWidth ? Math.pow(Math.cos((d2 / wingWidth) * (Math.PI / 2)), 1.8) : 0;
                return (factor1 + factor2) * (earAmp * 1.1);
              }

              case 'apex_prism': {
                // Pure triangular faceted crests
                const count = peripheralCount === 4 ? 4 : 3;
                const modA = ((rotTheta * count) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const tri = 1 - Math.abs((modA / Math.PI) - 1);
                return Math.pow(Math.max(0, tri), 2.2) * (earAmp * 1.15);
              }

              case 'harmonic_crown':
              case 'laser_crown': {
                // 3 or 4 geometric crown peaks
                const crests = peripheralCount === 4 ? 4 : 3;
                const cosVal = Math.cos(rotTheta * crests);
                return cosVal > 0 ? Math.pow(cosVal, 2.8) * (earAmp * 1.1) : 0;
              }

              case 'laser_needles': {
                // Ultra-slender needle spires
                const crests = peripheralCount === 4 ? 4 : 2;
                const cosVal = Math.cos(rotTheta * crests + Math.PI / 2);
                return cosVal > 0 ? Math.pow(cosVal, 4.2) * (earAmp * 1.35) : 0;
              }

              case 'fractal': {
                // Sacred fractal petal breathing
                const petals = peripheralCount === 4 ? 8 : 6;
                const cosVal = Math.cos(rotTheta * petals);
                return cosVal > 0 ? Math.pow(cosVal, 1.8) * (earAmp * 1.15) : 0;
              }

              case 'wave_peaks': {
                // Dynamic ripple wave peaks traveling on perimeter
                const w = Math.sin(rotTheta * 8 + timeSec * 3.5) * 0.5 + Math.cos(rotTheta * 16 - timeSec * 2.0) * 0.3;
                return Math.pow(Math.max(0, w + 0.4), 2.2) * (earAmp * 1.25);
              }

              default:
                return 0;
            }
          };

          // Draw the hairline curve
          const points = 160;
          ctx.beginPath();

          for (let i = 0; i <= points; i++) {
            const theta = (i / points) * Math.PI * 2;
            const rPrev = evaluateShapeRadius(currentShapeRef.current, theta);
            const rNext = evaluateShapeRadius(targetShapeRef.current, theta);
            // Smooth 400ms morphing
            const rOffset = rPrev + (rNext - rPrev) * morphProgressRef.current;
            const noteWave = Math.sin(theta * 6 + timeSec * 4.2) * (sEnergy * 5 * noteFactor) * u;
            const totalR = baseRadius + rOffset + (rOffset > 1 ? noteWave : 0);

            const px = cx + Math.cos(theta) * totalR;
            const py = cy + Math.sin(theta) * totalR;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }

          ctx.closePath();

          // Hairline stroke (0.75px - 1.5px), no fill, max opacity 0.25 (Subtle, non-invasive)
          ctx.strokeStyle = ringColors.stroke;
          ctx.lineWidth = Math.max(0.75, strokeHairline * u);
          ctx.globalAlpha = 0.22 + sEnergy * 0.08;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = ringColors.stroke;
          ctx.shadowBlur = 6 * u;
          ctx.stroke();

          ctx.restore();
        }
      } else if (canvas && !showPeripheral) {
        // Clear canvas when disabled
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    getSmoothedData,
    musicSensitivity,
    isPlaying,
    isMicActive,
    scaleFactor,
    showPeripheral,
    peripheralType,
    peripheralCount,
    strokeHairline,
    kickIntensity,
    ringColors,
    blobSettings.circleSize,
  ]);

  // Dimensions
  const coreDiameter = Math.round((blobSettings.circleSize || 179) * scaleFactor * 0.5);
  const ringDiameter = coreDiameter + Math.round(strokeHairline * 2 * scaleFactor);

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-auto">
      {/* 1. Optional Peripheral Shapes Canvas (Z-Index: 5, perfectly centered) */}
      {showPeripheral && (
        <canvas
          data-visualizer="true"
          ref={canvasRef}
          width={Math.round(520 * scaleFactor * (window.devicePixelRatio || 1))}
          height={Math.round(520 * scaleFactor * (window.devicePixelRatio || 1))}
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2"
          style={{
            width: `${Math.round(520 * scaleFactor)}px`,
            height: `${Math.round(520 * scaleFactor)}px`,
          }}
        />
      )}

      {/* 2. El Aro Cónico Giratorio (Protagonista: 1.5px hairline mask) */}
      <div
        ref={ringRef}
        className="absolute rounded-full pointer-events-none transition-transform duration-75 ease-out"
        style={{
          width: `${ringDiameter}px`,
          height: `${ringDiameter}px`,
          background: ringColors.conic,
          // WebkitMask / Mask: Guarantees exact 1.5px hairline thickness
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${strokeHairline}px), #fff calc(100% - ${strokeHairline}px))`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${strokeHairline}px), #fff calc(100% - ${strokeHairline}px))`,
          // Focused drop-shadow (6px-10px, max 0.3 opacity)
          filter: `drop-shadow(0 0 8px ${ringColors.glow})`,
        }}
      />

      {/* 3. El Núcleo Abisal ("The Void" - #05070E) */}
      <div
        ref={coreRef}
        className="relative z-10 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-75 ease-out"
        style={{
          width: `${coreDiameter}px`,
          height: `${coreDiameter}px`,
          backgroundColor: '#05070E',
          // Titanium 1px bezel with subtle inner depth
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.15), 0 0 20px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Vinyl Grooves Overlay */}
        <div className="absolute inset-0 rounded-full border border-white/[0.08] pointer-events-none" />
        <div className="absolute inset-[16%] rounded-full border border-white/[0.05] pointer-events-none" />
        <div className="absolute inset-[32%] rounded-full border border-white/[0.04] pointer-events-none" />

        {/* Center Logo or Custom Artwork */}
        {centerLogo && <div className="relative z-20 flex items-center justify-center">{centerLogo}</div>}
      </div>
    </div>
  );
};

export default LiquidVoidCircle;
