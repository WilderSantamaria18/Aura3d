import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Music } from 'lucide-react';
import { AudioEngine } from '../../services/audioEngine';
import type { ChameleonPalette } from '../../services/chameleonPaletteService';

interface HolographicAlbumSleeveProps {
  coverUrl?: string;
  title: string;
  artist: string;
  isPlaying: boolean;
  accentColor: string;
  palette: ChameleonPalette;
  isVideoTrack?: boolean;
  onShowVideo?: () => void;
  size?: 'normal' | 'large';
}

export function computeTiltCoordinates(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const rawX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const rawY = ((clientY - rect.top) / rect.height) * 2 - 1;
  return {
    x: Math.max(-1, Math.min(1, rawX)),
    y: Math.max(-1, Math.min(1, rawY)),
  };
}

export function computeSleeveRotations(tilt: { x: number; y: number }): {
  rotX: number;
  rotY: number;
  shadowX: number;
  shadowY: number;
  sheenAngle: number;
} {
  return {
    rotX: -tilt.y * 14,
    rotY: tilt.x * 14,
    shadowX: -tilt.x * 16,
    shadowY: -tilt.y * 16 + 18,
    sheenAngle: 120 + tilt.x * 35 + tilt.y * 20,
  };
}

export function advanceVinylAngle(currentAngle: number, deltaMs: number, rpm = 33.3): number {
  const degPerSec = (rpm * 360) / 60;
  return (currentAngle + (degPerSec * Math.max(0, deltaMs)) / 1000) % 360;
}

/**
 * HolographicAlbumSleeve — Funda de Álbum 3D Holográfica & Vinilo Conic Glare
 *
 * Implements physical 3D perspective tilt with mouse physics, dynamic polarized
 * specular sheen, and high-definition grooved vinyl disc with anisotropic light cones.
 */
export const HolographicAlbumSleeve: React.FC<HolographicAlbumSleeveProps> = ({
  coverUrl,
  title,
  isPlaying,
  accentColor,
  palette,
  isVideoTrack,
  onShowVideo,
  size = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 3D Tilt Coordinates (-1 to 1)
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Smooth continuous vinyl rotation angle (preserves momentum across play/pause)
  const vinylAngleRef = useRef<number>(0);
  const [vinylAngle, setVinylAngle] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Audio bass pulse reaction
  const [bassScale, setBassScale] = useState(1);

  // Continuous vinyl spin & audio bass reactivity loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;

      if (isPlaying) {
        vinylAngleRef.current = advanceVinylAngle(vinylAngleRef.current, dt);
        setVinylAngle(vinylAngleRef.current);

        // Audio kick pulse
        const freq = AudioEngine.getInstance().getFrequencyData();
        const rawBass = freq.bass || 0;
        setBassScale(1 + rawBass * 0.035);
      } else {
        setBassScale((prev) => prev + (1 - prev) * 0.1);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTilt(computeTiltCoordinates(e.clientX, e.clientY, rect));
  }, []);

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const sleeveSizeClass = size === 'large' ? 'w-36 h-36 sm:w-40 sm:h-40' : 'w-28 h-28 sm:w-32 sm:h-32';
  const vinylSizeClass = size === 'large' ? 'w-36 h-36 sm:w-40 sm:h-40' : 'w-28 h-28 sm:w-32 sm:h-32';
  const vinylSlideOffset = isPlaying ? 'translate-x-9 sm:translate-x-11 opacity-100' : 'translate-x-0 opacity-0';

  const { rotX, rotY, shadowX, shadowY, sheenAngle } = computeSleeveRotations(tilt);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center p-2 select-none cursor-pointer group"
      style={{ perspective: '900px' }}
    >
      {/* ── 0. Ambient Chameleon Aura & Rhythm Glow ── */}
      <div
        className="absolute -inset-3 rounded-3xl opacity-65 blur-2xl pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, ${palette.secondary} 45%, transparent 75%)`,
          transform: `scale(${bassScale * (isHovered ? 1.08 : 1)})`,
        }}
      />

      {/* ── 1. Grooved Acetate Vinyl Disc with Conic Glare Cones ── */}
      <div
        className={`absolute top-2 bottom-2 left-2 ${vinylSizeClass} rounded-full transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none flex items-center justify-center ${vinylSlideOffset}`}
        style={{
          transform: `translateX(${isPlaying ? (size === 'large' ? 44 : 36) : 0}px) scale(${bassScale}) rotate(${vinylAngle}deg)`,
          boxShadow: `0 14px 34px -4px rgba(0, 0, 0, 0.9), inset 0 0 12px rgba(0, 0, 0, 0.95), 0 0 18px ${palette.glow}`,
          background: `
            radial-gradient(circle at 50% 50%, transparent 0%, transparent 22%, rgba(0, 0, 0, 0.75) 24%),
            repeating-radial-gradient(circle at 50% 50%, #08090d 0px, #141822 1.5px, #06070a 3px, #1a202d 4.5px)
          `,
          zIndex: 1,
        }}
      >
        {/* Anisotropic Light Cones (Dual Conic Highlights) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-50"
          style={{
            background: `conic-gradient(
              from 45deg,
              rgba(255, 255, 255, 0.22) 0deg,
              transparent 45deg,
              transparent 135deg,
              rgba(255, 255, 255, 0.25) 180deg,
              transparent 225deg,
              transparent 315deg,
              rgba(255, 255, 255, 0.22) 360deg
            )`,
          }}
        />

        {/* Center Circular Artwork Label (Miniature Album Disc Label) */}
        <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-white/30 flex items-center justify-center shadow-lg bg-black/80">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
          ) : (
            <Music className="w-4 h-4 text-white/60" />
          )}

          {/* Center Spindle Hole with Chrome Bevel */}
          <div
            className="absolute w-2.5 h-2.5 rounded-full bg-slate-950 border border-white/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_0_2px_rgba(255,255,255,0.6)]"
          />
        </div>
      </div>

      {/* ── 2. Main 3D Holographic Album Sleeve ── */}
      <div
        className={`relative z-10 ${sleeveSizeClass} rounded-2xl overflow-hidden shadow-2xl border transition-all duration-200 ease-out`}
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${isHovered ? 1.04 : 1})`,
          transformStyle: 'preserve-3d',
          borderColor: isHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.18)',
          boxShadow: `
            ${shadowX}px ${shadowY}px 40px -8px rgba(0, 0, 0, 0.85),
            0 0 24px -4px ${palette.glow},
            inset 0 1px 1px rgba(255, 255, 255, 0.35)
          `,
        }}
      >
        {/* Cover Artwork Image */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isPlaying ? 'scale-105' : 'scale-100 opacity-95'
            }`}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center text-white/50">
            <Music className="w-8 h-8" />
          </div>
        )}

        {/* ── 3. Polarized Prismatic Holographic Sheen Layer ── */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-overlay"
          style={{
            opacity: isHovered ? 0.85 : 0.45,
            background: `linear-gradient(
              ${sheenAngle}deg,
              transparent 25%,
              rgba(255, 255, 255, 0.18) 46%,
              rgba(255, 255, 255, 0.55) 50%,
              rgba(255, 255, 255, 0.18) 54%,
              transparent 75%
            )`,
          }}
        />

        {/* ── 4. Prismatic Foil Micro-Rainbow Glare ── */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.35 : 0.15,
            background: `radial-gradient(
              ellipse at ${50 + tilt.x * 35}% ${50 + tilt.y * 35}%,
              rgba(0, 229, 255, 0.5) 0%,
              rgba(244, 63, 94, 0.35) 45%,
              rgba(168, 85, 247, 0.25) 70%,
              transparent 95%
            )`,
          }}
        />

        {/* ── 5. Video Mode Switch Button (if applicable) ── */}
        {isVideoTrack && onShowVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShowVideo();
            }}
            className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/80 text-cyan-300 hover:text-white border border-cyan-400/40 hover:border-cyan-400 backdrop-blur-md transition-all active:scale-95 shadow-lg z-20 cursor-pointer"
            title="Ver video de YouTube"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Video</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default HolographicAlbumSleeve;
