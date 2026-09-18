import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { EyeOff, Maximize2 } from 'lucide-react';

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
  aspect: string;
  label: string;
  resolutionText: string;
}

export const CaptureFramingOverlay: React.FC = () => {
  const {
    isFramingGuideActive,
    isCaptureStudioOpen,
    captureAspectRatio,
    captureQuality,
    toggleFramingGuide,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
  } = usePlayerStore();

  const [windowSize, setWindowSize] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only show if user enabled the framing guide or when capture studio is open with guide enabled
  if (!isFramingGuideActive) return null;

  const activeAccent = isLucid
    ? lucidPrimaryColor || lucidTheme.primary || '#00e5ff'
    : '#00e5ff';

  // Calculate target aspect ratio number
  let targetRatioNum = 16 / 9;
  let ratioLabel = '16:9 Cinema';
  let resText = captureQuality === '4k' ? '3840 × 2160 (4K 60FPS)' : '1920 × 1080 (FHD 60FPS)';

  switch (captureAspectRatio) {
    case '9:16':
      targetRatioNum = 9 / 16;
      ratioLabel = '9:16 Vertical (Reels / TikTok / Shorts)';
      resText = captureQuality === '4k' ? '2160 × 3840 (4K 60FPS)' : '1080 × 1920 (FHD 60FPS)';
      break;
    case '1:1':
      targetRatioNum = 1;
      ratioLabel = '1:1 Square (Instagram / Album)';
      resText = captureQuality === '4k' ? '2160 × 2160 (4K 60FPS)' : '1080 × 1080 (FHD 60FPS)';
      break;
    case '4:5':
      targetRatioNum = 4 / 5;
      ratioLabel = '4:5 Social Portrait';
      resText = captureQuality === '4k' ? '1728 × 2160 (4K 60FPS)' : '1080 × 1350 (FHD 60FPS)';
      break;
    case '16:9':
    default:
      targetRatioNum = 16 / 9;
      ratioLabel = '16:9 Widescreen (YouTube / Desktop)';
      resText = captureQuality === '4k' ? '3840 × 2160 (4K 60FPS)' : '1920 × 1080 (FHD 60FPS)';
      break;
  }

  const screenW = windowSize.w;
  const screenH = windowSize.h;
  const screenAspect = screenW / screenH;

  let frameW = screenW;
  let frameH = screenH;

  if (screenAspect > targetRatioNum) {
    // Screen is wider than target: pillarbox
    frameH = screenH;
    frameW = screenH * targetRatioNum;
  } else {
    // Screen is taller than target: letterbox
    frameW = screenW;
    frameH = screenW / targetRatioNum;
  }

  const frameX = (screenW - frameW) / 2;
  const frameY = (screenH - frameH) / 2;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden animate-fade-in">
      {/* ── 1. Darkened Scrim Outside Recording Area (Pillarbox/Letterbox) ── */}
      {/* Top Scrim */}
      <div
        className="absolute left-0 right-0 top-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        style={{ height: `${Math.max(0, frameY)}px` }}
      />
      {/* Bottom Scrim */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        style={{ height: `${Math.max(0, screenH - (frameY + frameH))}px` }}
      />
      {/* Left Scrim */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        style={{
          width: `${Math.max(0, frameX)}px`,
          top: `${frameY}px`,
          height: `${frameH}px`,
        }}
      />
      {/* Right Scrim */}
      <div
        className="absolute top-0 bottom-0 right-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto"
        style={{
          width: `${Math.max(0, screenW - (frameX + frameW))}px`,
          top: `${frameY}px`,
          height: `${frameH}px`,
        }}
      />

      {/* ── 2. Active Frame Border & Cine Crosshairs ── */}
      <div
        className="absolute transition-all duration-300 pointer-events-none"
        style={{
          left: `${frameX}px`,
          top: `${frameY}px`,
          width: `${frameW}px`,
          height: `${frameH}px`,
          border: `1.5px solid ${activeAccent}88`,
          boxShadow: `0 0 24px ${activeAccent}33, inset 0 0 20px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Cine Corner Registration Marks */}
        {/* Top-Left */}
        <div
          className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2"
          style={{ borderColor: activeAccent }}
        />
        {/* Top-Right */}
        <div
          className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2"
          style={{ borderColor: activeAccent }}
        />
        {/* Bottom-Left */}
        <div
          className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2"
          style={{ borderColor: activeAccent }}
        />
        {/* Bottom-Right */}
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2"
          style={{ borderColor: activeAccent }}
        />

        {/* Rule of Thirds subtle lines */}
        <div className="absolute inset-x-0 top-1/3 border-t border-white/[0.08] pointer-events-none" />
        <div className="absolute inset-x-0 top-2/3 border-t border-white/[0.08] pointer-events-none" />
        <div className="absolute inset-y-0 left-1/3 border-l border-white/[0.08] pointer-events-none" />
        <div className="absolute inset-y-0 left-2/3 border-l border-white/[0.08] pointer-events-none" />

        {/* Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
        </div>

        {/* ── 3. Luminous Format Badge (Top-Center of Frame) ── */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-xl">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: activeAccent }}
          />
          <span className="text-[11px] font-mono font-bold tracking-tight">{ratioLabel}</span>
          <span className="text-white/30 text-[10px]">•</span>
          <span className="text-[10px] font-mono text-cyan-300/90">{resText}</span>

          <button
            onClick={toggleFramingGuide}
            className="ml-1 p-1 rounded-full bg-white/10 hover:bg-white/25 text-white/70 hover:text-white transition-all cursor-pointer"
            title="Ocultar guía de encuadre"
            aria-label="Ocultar guía de encuadre"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>

        {/* Framing safe area note (Bottom-Center) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[9px] font-mono text-white/50 tracking-wider uppercase pointer-events-none">
          ÁREA DE ENCUADRE ACTIVA
        </div>
      </div>
    </div>
  );
};

export default CaptureFramingOverlay;
