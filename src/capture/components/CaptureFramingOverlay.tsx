import React, { useEffect, useState } from 'react';
import { useCaptureStore } from '../store/captureStore';
import { EyeOff } from 'lucide-react';

export const CaptureFramingOverlay: React.FC = () => {
  const { session, toggleFramingGuide } = useCaptureStore();
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

  if (!session.framingGuide) return null;

  let targetRatioNum = 16 / 9;
  let ratioLabel = '16:9 Cinema';
  let resText = session.resolution === '4k' ? '3840 × 2160 (4K 60FPS)' : '1920 × 1080 (FHD 60FPS)';

  switch (session.aspectRatio) {
    case '9:16':
      targetRatioNum = 9 / 16;
      ratioLabel = '9:16 Vertical (Reels / TikTok / Shorts)';
      resText = session.resolution === '4k' ? '2160 × 3840 (4K 60FPS)' : '1080 × 1920 (FHD 60FPS)';
      break;
    case '1:1':
      targetRatioNum = 1;
      ratioLabel = '1:1 Cuadrado (Instagram / Carátula)';
      resText = session.resolution === '4k' ? '2160 × 2160 (4K 60FPS)' : '1080 × 1080 (FHD 60FPS)';
      break;
    case '4:5':
      targetRatioNum = 4 / 5;
      ratioLabel = '4:5 Retrato (Feed Instagram)';
      resText = session.resolution === '4k' ? '1728 × 2160 (4K 60FPS)' : '1080 × 1350 (FHD 60FPS)';
      break;
  }

  const screenAspect = windowSize.w / windowSize.h;
  let frameW = windowSize.w;
  let frameH = windowSize.h;
  let frameX = 0;
  let frameY = 0;

  if (screenAspect > targetRatioNum) {
    frameW = windowSize.h * targetRatioNum;
    frameX = (windowSize.w - frameW) / 2;
  } else {
    frameH = windowSize.w / targetRatioNum;
    frameY = (windowSize.h - frameH) / 2;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-40 transition-opacity duration-300"
      aria-hidden="true"
    >
      {/* Pillarbox / Letterbox Overlays */}
      {frameX > 0 && (
        <>
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/85 backdrop-blur-[3px] border-r border-cyan-400/30 transition-all duration-300 pointer-events-auto"
            style={{ width: `${frameX}px` }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/85 backdrop-blur-[3px] border-l border-cyan-400/30 transition-all duration-300 pointer-events-auto"
            style={{ width: `${frameX}px` }}
          />
        </>
      )}

      {frameY > 0 && (
        <>
          <div
            className="absolute left-0 right-0 top-0 bg-black/85 backdrop-blur-[3px] border-b border-cyan-400/30 transition-all duration-300 pointer-events-auto"
            style={{ height: `${frameY}px` }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/85 backdrop-blur-[3px] border-t border-cyan-400/30 transition-all duration-300 pointer-events-auto"
            style={{ height: `${frameY}px` }}
          />
        </>
      )}

      {/* Target Framing Rect */}
      <div
        className="absolute transition-all duration-300 border-2 border-cyan-400/60 shadow-[0_0_24px_rgba(0,229,255,0.3)] rounded-lg pointer-events-none"
        style={{
          left: `${frameX}px`,
          top: `${frameY}px`,
          width: `${frameW}px`,
          height: `${frameH}px`,
        }}
      >
        {/* Floating Tag */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 border border-white/20 backdrop-blur-md pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold text-white tracking-wider">
            {session.aspectRatio} • {resText}
          </span>
          <button
            onClick={() => toggleFramingGuide()}
            className="ml-1 p-0.5 rounded hover:bg-white/20 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Ocultar guías de encuadre"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
