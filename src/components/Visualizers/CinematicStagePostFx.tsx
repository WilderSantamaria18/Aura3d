/**
 * CinematicStagePostFx — Master 3D Stage Optical & Post-Processing Engine 2.0
 *
 * Implements cinema-grade optical shaders & reactive stage effects:
 *  1. Sub-Bass Kick Shockwaves (< 80 Hz): Expanding refractive sonic wave rings that
 *     scatter cosmic dust particles with physical impulse.
 *  2. Anamorphic Lens Flare (Panavision 2.39:1): Horizontal laser flare streak that
 *     flashes across the viewport on peak transients and drops.
 *  3. Dynamic Bokeh Depth of Field (DoF): Dreamy specular lens bokeh discs during ambient
 *     breakdowns that dissolve into razor-sharp focus when the drop hits.
 *  4. Volumetric Kick Bloom Flare & Peripheral Prismatic Dispersion.
 *  5. Reactive Perimeter 360° Ambilight & Cosmic Dust Field.
 *  6. Atmospheric Floating Lyrics Projection (visionOS Glass).
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';
import { hexToRgba } from '../../types/audio';
import { useLyrics } from '../../hooks/useLyrics';
import { useLyricSync } from '../../hooks/useLyricSync';

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  color: string;
  secondaryColor: string;
}

interface BokehOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  phase: number;
}

export const CinematicStagePostFx: React.FC = () => {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const isLyricsOpen = usePlayerStore((s) => s.isLyricsOpen);
  const isKaraokeFullscreen = usePlayerStore((s) => s.isKaraokeFullscreen);

  // Atmospheric lyrics in 3D stage
  const { lyricsData } = useLyrics();
  const emptyRefList = useMemo(() => [], []);
  const { activeLineIndex } = useLyricSync(lyricsData.lines, emptyRefList);
  const currentLyricLine =
    activeLineIndex >= 0 && lyricsData.lines[activeLineIndex]
      ? lyricsData.lines[activeLineIndex].text
      : null;
  const showAtmosphericLyrics =
    isPlaying &&
    !isLyricsOpen &&
    !isKaraokeFullscreen &&
    Boolean(currentLyricLine && currentLyricLine.trim());

  // DOM & Canvas Refs
  const bloomRef = useRef<HTMLDivElement>(null);
  const anamorphicRef = useRef<HTMLDivElement>(null);
  const aberrationRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const ambilightRef = useRef<HTMLDivElement>(null);
  const dofBackdropRef = useRef<HTMLDivElement>(null);

  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<DustParticle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const bokehOrbsRef = useRef<BokehOrb[]>([]);
  const prevModeRef = useRef(visualizerMode);

  const primaryColor = isLucid ? lucidTheme?.primary || '#00e5ff' : '#00e5ff';
  const secondaryColor = isLucid ? lucidTheme?.secondary || '#ff007f' : '#a855f7';

  // 1. Initialize Cosmic Dust and Bokeh Specular Discs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Cosmic Dust Particles
    const dustCount = 48;
    const dustList: DustParticle[] = [];
    for (let i = 0; i < dustCount; i++) {
      dustList.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 1.0 + Math.random() * 2.2,
        alpha: 0.25 + Math.random() * 0.45,
        baseAlpha: 0.25 + Math.random() * 0.45,
      });
    }
    particlesRef.current = dustList;

    // Bokeh Specular Discs (Depth of Field)
    const bokehCount = 14;
    const bokehList: BokehOrb[] = [];
    for (let i = 0; i < bokehCount; i++) {
      bokehList.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: 28 + Math.random() * 45,
        baseAlpha: 0.12 + Math.random() * 0.16,
        phase: Math.random() * Math.PI * 2,
      });
    }
    bokehOrbsRef.current = bokehList;

    const handleResize = () => {
      if (fxCanvasRef.current) {
        fxCanvasRef.current.width = window.innerWidth;
        fxCanvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Metamorphic Transition Flash when switching 3D Modes
  useEffect(() => {
    if (prevModeRef.current !== visualizerMode) {
      prevModeRef.current = visualizerMode;
      if (flashRef.current) {
        flashRef.current.style.opacity = '0.85';
        flashRef.current.style.transform = 'scale(1.04)';
        const timer = setTimeout(() => {
          if (flashRef.current) {
            flashRef.current.style.opacity = '0';
            flashRef.current.style.transform = 'scale(1)';
          }
        }, 450);
        return () => clearTimeout(timer);
      }
    }
  }, [visualizerMode]);

  // 3. Master 60 FPS Optical Post-Processing Loop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId: number;
    let smoothBass = 0;
    let smoothEnergy = 0;
    let prevSubBass = 0;
    let lastShockwaveTime = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      let subBass = 0;
      let rawBass = 0;
      let rawEnergy = 0;

      if (!isPlaying) {
        smoothBass += (0 - smoothBass) * 0.1;
        smoothEnergy += (0 - smoothEnergy) * 0.1;
      } else {
        const freq = AudioEngine.getInstance().getFrequencyData();
        rawBass = freq.bass || 0;
        rawEnergy = freq.energy || 0;

        // Sub-Bass calculation (< 80 Hz band from FFT bins 1..4)
        if (freq.raw && freq.raw.length >= 5) {
          subBass = (freq.raw[1] + freq.raw[2] + freq.raw[3] + freq.raw[4]) / (4 * 255);
        } else {
          subBass = rawBass;
        }

        // Fast transient attack, smooth decay
        smoothBass += (rawBass - smoothBass) * (rawBass > smoothBass ? 0.45 : 0.12);
        smoothEnergy += (rawEnergy - smoothEnergy) * (rawEnergy > smoothEnergy ? 0.35 : 0.08);
      }

      const bassIntensity = prefersReduced ? smoothBass * 0.25 : smoothBass;
      const energyIntensity = prefersReduced ? smoothEnergy * 0.3 : smoothEnergy;

      // ── A. Sub-Bass Kick Shockwave Trigger ─────────────────────────────
      const isKickTransient =
        isPlaying &&
        !prefersReduced &&
        subBass > 0.58 &&
        subBass - prevSubBass > 0.15 &&
        now - lastShockwaveTime > 220; // 220ms minimum interval between shockwaves

      if (isKickTransient && fxCanvasRef.current) {
        lastShockwaveTime = now;
        const w = fxCanvasRef.current.width || window.innerWidth;
        const h = fxCanvasRef.current.height || window.innerHeight;
        shockwavesRef.current.push({
          x: w / 2,
          y: h * 0.5,
          radius: 20,
          maxRadius: Math.min(w, h) * 0.82,
          speed: 800 + subBass * 280,
          alpha: 0.95,
          color: primaryColor,
          secondaryColor,
        });

        // Limit concurrent shockwaves to 3
        if (shockwavesRef.current.length > 3) {
          shockwavesRef.current.shift();
        }
      }
      prevSubBass = subBass;

      // ── B. Anamorphic Lens Flare (Panavision 2.39:1 horizontal laser beam) ──
      if (anamorphicRef.current) {
        const flarePower = Math.max(0, (subBass - 0.52) * 2.2);
        const flareOpacity = prefersReduced ? 0 : Math.min(0.9, flarePower * 0.95);
        anamorphicRef.current.style.opacity = flareOpacity.toFixed(3);
        if (flareOpacity > 0.01) {
          const scaleX = (1.5 + subBass * 0.9).toFixed(3);
          const scaleY = (1.0 + subBass * 0.5).toFixed(3);
          anamorphicRef.current.style.transform = `scale(${scaleX}, ${scaleY})`;
        }
      }

      // ── C. Volumetric Kick Bloom Flare ──────────────────────────────────
      if (bloomRef.current) {
        const bloomOpacity = Math.max(0, (bassIntensity - 0.22) * 0.6);
        bloomRef.current.style.opacity = bloomOpacity.toFixed(3);
        if (!prefersReduced) {
          const scale = (1.0 + bassIntensity * 0.05).toFixed(4);
          bloomRef.current.style.transform = `scale(${scale})`;
        }
      }

      // ── D. Dynamic Bokeh Depth of Field (DoF) ───────────────────────────
      // In quiet passages (energy < 0.3), backdrop softens with bokeh DoF blur
      if (dofBackdropRef.current) {
        const quietness = Math.max(0, 1.0 - smoothEnergy * 2.5);
        const blurPx = prefersReduced ? 0 : quietness * 5.5;
        dofBackdropRef.current.style.backdropFilter = blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
        dofBackdropRef.current.style.opacity = (quietness * 0.65).toFixed(3);
      }

      // ── E. Peripheral Chromatic Aberration ──────────────────────────────
      if (aberrationRef.current) {
        const aberOpacity = (0.04 + energyIntensity * 0.26 + subBass * 0.18).toFixed(3);
        aberrationRef.current.style.opacity = aberOpacity;
      }

      // ── F. Reactive Breathing Vignette ──────────────────────────────────
      if (vignetteRef.current) {
        const vigOpacity = (0.32 + bassIntensity * 0.28).toFixed(3);
        vignetteRef.current.style.opacity = vigOpacity;
      }

      // ── G. Perimeter 360° Ambilight Halo ────────────────────────────────
      if (ambilightRef.current) {
        const ambiOpacity = (0.08 + bassIntensity * 0.48 + energyIntensity * 0.25).toFixed(3);
        ambilightRef.current.style.opacity = ambiOpacity;
      }

      // ── H. Canvas Rendering (Shockwaves + Cosmic Dust + Bokeh Discs) ────
      const canvas = fxCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // 1. Render Bokeh Specular Discs during ambient moments
          const ambientLevel = Math.max(0, 1.0 - smoothEnergy * 2.2);
          if (ambientLevel > 0.05 && !prefersReduced) {
            for (let i = 0; i < bokehOrbsRef.current.length; i++) {
              const b = bokehOrbsRef.current[i];
              b.x += b.vx;
              b.y += b.vy;
              b.phase += dt * 0.5;

              if (b.x < -b.radius) b.x = w + b.radius;
              if (b.x > w + b.radius) b.x = -b.radius;
              if (b.y < -b.radius) b.y = h + b.radius;
              if (b.y > h + b.radius) b.y = -b.radius;

              const pulse = Math.sin(b.phase) * 0.2 + 0.8;
              const alpha = b.baseAlpha * ambientLevel * pulse;

              const grad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.2, b.x, b.y, b.radius);
              grad.addColorStop(0, hexToRgba(primaryColor, alpha * 0.7));
              grad.addColorStop(0.7, hexToRgba(secondaryColor, alpha * 0.2));
              grad.addColorStop(1, 'rgba(0,0,0,0)');

              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
              ctx.fill();

              // Specular rim
              ctx.strokeStyle = hexToRgba('#ffffff', alpha * 0.35);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }

          // 2. Render and Update Sub-Bass Kick Shockwaves
          if (!prefersReduced && shockwavesRef.current.length > 0) {
            for (let sIdx = shockwavesRef.current.length - 1; sIdx >= 0; sIdx--) {
              const s = shockwavesRef.current[sIdx];
              s.radius += s.speed * dt;
              const progress = s.radius / s.maxRadius;
              s.alpha = Math.max(0, Math.pow(1 - progress, 1.8) * 0.85);

              if (progress >= 1.0 || s.alpha <= 0.01) {
                shockwavesRef.current.splice(sIdx, 1);
                continue;
              }

              // Optical Refraction Outer Ring
              ctx.beginPath();
              ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
              ctx.strokeStyle = hexToRgba(s.color, s.alpha * 0.7);
              ctx.lineWidth = 3.5 + (1 - progress) * 6;
              ctx.shadowColor = s.color;
              ctx.shadowBlur = 16 * s.alpha;
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Sharp Core Laser Wavefront
              ctx.beginPath();
              ctx.arc(s.x, s.y, Math.max(0, s.radius - 2), 0, Math.PI * 2);
              ctx.strokeStyle = hexToRgba('#ffffff', s.alpha * 0.95);
              ctx.lineWidth = 1.4;
              ctx.stroke();

              // Trailing Chromatic Edge Ring
              ctx.beginPath();
              ctx.arc(s.x, s.y, Math.max(0, s.radius * 0.95), 0, Math.PI * 2);
              ctx.strokeStyle = hexToRgba(s.secondaryColor, s.alpha * 0.45);
              ctx.lineWidth = 2.0;
              ctx.stroke();

              // Push particles outward with shockwave impulse
              for (let pIdx = 0; pIdx < particlesRef.current.length; pIdx++) {
                const p = particlesRef.current[pIdx];
                const dx = p.x - s.x;
                const dy = p.y - s.y;
                const dist = Math.hypot(dx, dy) || 1;
                const diff = Math.abs(dist - s.radius);
                if (diff < 32) {
                  const force = (1 - diff / 32) * s.alpha * 7.5;
                  p.vx += (dx / dist) * force;
                  p.vy += (dy / dist) * force;
                }
              }
            }
          }

          // 3. Render and Update Cosmic Dust Particles
          for (let i = 0; i < particlesRef.current.length; i++) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;

            // Physical friction/damping
            p.vx *= 0.96;
            p.vy *= 0.96;

            // Ambient gentle drift
            p.x += Math.sin(now * 0.001 + i) * 0.25;
            p.y += Math.cos(now * 0.001 + i) * 0.25;

            // Wrap around screen bounds
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            const currentAlpha = Math.min(1, p.baseAlpha * (0.6 + bassIntensity * 0.9 + energyIntensity * 0.4));
            const currentSize = p.size * (1 + bassIntensity * 0.4);

            ctx.beginPath();
            ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(primaryColor, currentAlpha);
            ctx.shadowBlur = 8;
            ctx.shadowColor = primaryColor;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, primaryColor, secondaryColor]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* ── 0. Dynamic Bokeh Depth of Field Backdrop Blur (Ambient Passages) ── */}
      <div
        ref={dofBackdropRef}
        className="absolute inset-0 pointer-events-none transition-all duration-700 ease-out"
        style={{ opacity: 0 }}
      />

      {/* ── 1. Volumetric Kick Bloom Flare (Central atmospheric light ball) ── */}
      <div
        ref={bloomRef}
        className="absolute inset-0 pointer-events-none will-change-transform transform-gpu transition-opacity duration-75 mix-blend-screen"
        style={{
          opacity: 0,
          background: `
            radial-gradient(ellipse 70% 45% at 50% 50%, ${hexToRgba(primaryColor, 0.45)} 0%, ${hexToRgba(secondaryColor, 0.15)} 40%, transparent 75%),
            radial-gradient(ellipse 120% 8% at 50% 50%, rgba(255, 255, 255, 0.3) 0%, ${hexToRgba(primaryColor, 0.2)} 45%, transparent 80%)
          `,
        }}
      />

      {/* ── 2. Anamorphic Lens Flare (Panavision 2.39:1 Cinema Laser Beam) ── */}
      <div
        ref={anamorphicRef}
        className="absolute inset-0 pointer-events-none will-change-transform mix-blend-screen transition-opacity duration-75"
        style={{
          opacity: 0,
          background: `
            radial-gradient(ellipse 180% 3.5px at 50% 50%, #ffffff 0%, ${hexToRgba(primaryColor, 0.85)} 30%, ${hexToRgba(secondaryColor, 0.3)} 65%, transparent 95%),
            radial-gradient(ellipse 120% 10px at 50% 50%, ${hexToRgba(primaryColor, 0.45)} 0%, transparent 80%)
          `,
          transform: 'scaleX(1.8)',
        }}
      />

      {/* ── 3. Peripheral Chromatic Aberration (Prismatic edge dispersion) ── */}
      <div
        ref={aberrationRef}
        className="absolute inset-0 pointer-events-none will-change-transform transition-opacity duration-150 mix-blend-screen"
        style={{
          opacity: 0.04,
          background: `
            radial-gradient(ellipse at center, transparent 65%, rgba(0, 242, 254, 0.25) 92%, rgba(255, 0, 128, 0.35) 100%)
          `,
        }}
      />

      {/* ── 4. Reactive Breathing Vignette ── */}
      <div
        ref={vignetteRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: 0.32,
          background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(1, 2, 8, 0.75) 100%)',
        }}
      />

      {/* ── 5. Responsive Perimeter 360° Ambilight Halo ── */}
      <div
        ref={ambilightRef}
        className="absolute inset-0 pointer-events-none transition-opacity duration-150 mix-blend-screen"
        style={{ opacity: 0 }}
      >
        <div
          className="absolute inset-x-0 top-0 h-36 pointer-events-none"
          style={{ background: `linear-gradient(to bottom, ${hexToRgba(primaryColor, 0.35)}, transparent)` }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${hexToRgba(secondaryColor, 0.35)}, transparent)` }}
        />
        <div
          className="absolute inset-y-0 left-0 w-36 pointer-events-none"
          style={{ background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.30)}, transparent)` }}
        />
        <div
          className="absolute inset-y-0 right-0 w-36 pointer-events-none"
          style={{ background: `linear-gradient(to left, ${hexToRgba(secondaryColor, 0.30)}, transparent)` }}
        />
      </div>

      {/* ── 6. Master Optical Canvas (Shockwaves + Cosmic Dust + Bokeh Discs) ── */}
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 pointer-events-none w-full h-full mix-blend-screen"
      />

      {/* ── 7. Cinematic Warp Flash (Scene Metamorphosis Bloom) ── */}
      <div
        ref={flashRef}
        className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out opacity-0 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at center, ${hexToRgba(primaryColor, 0.65)} 0%, ${hexToRgba(secondaryColor, 0.25)} 50%, transparent 75%)`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />

      {/* ── 8. Atmospheric 3D Floating Lyrics Projection (visionOS Glass Aesthetic) ── */}
      <AnimatePresence mode="wait">
        {showAtmosphericLyrics && (
          <motion.div
            key={`atmo-lyric-${activeLineIndex}-${currentLyricLine}`}
            initial={{ opacity: 0, y: 14, filter: 'blur(10px)', scale: 0.96 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)', scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-16 sm:top-20 inset-x-4 flex justify-center pointer-events-none z-30 select-none text-center"
          >
            <div className="max-w-2xl px-5 py-2.5 rounded-2xl bg-black/35 backdrop-blur-xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
              <p
                className="text-base sm:text-xl font-bold tracking-tight text-white leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
                style={{
                  textShadow: `0 0 24px ${primaryColor}66, 0 2px 10px rgba(0,0,0,0.8)`,
                }}
              >
                {currentLyricLine}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicStagePostFx;
