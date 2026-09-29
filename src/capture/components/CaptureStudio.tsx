import React, { useEffect } from 'react';
import {
  Camera,
  Video,
  PlaySquare,
  X,
  Sparkles,
  Film,
  AlertCircle,
} from 'lucide-react';
import { useCaptureStore } from '../store/captureStore';
import { captureController } from '../controller/CaptureController';
import { PhotoCapture } from './PhotoCapture';
import { VideoCapture } from './VideoCapture';
import { CapturePreview } from './CapturePreview';
import { CaptureFramingOverlay } from './CaptureFramingOverlay';
import type { CaptureMode } from '../types';

export const CaptureStudio: React.FC = () => {
  const {
    isStudioOpen,
    setStudioOpen,
    session,
    setMode,
    elapsedSeconds,
    errorMessage,
    setErrorMessage,
    result,
  } = useCaptureStore();

  const isRecording = session.status === 'recording';

  // Format MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Adaptive Liquid Glass blur depending on recording state to prevent GPU degradation
  const glassBlur = isRecording ? 'blur(8px)' : 'blur(36px)';
  const glassSaturate = isRecording ? 'saturate(100%)' : 'saturate(180%)';

  const TABS: { id: CaptureMode; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'photo', label: 'Foto 4K', icon: <Camera className="w-3.5 h-3.5" /> },
    {
      id: 'video',
      label: 'Video',
      icon: <Video className="w-3.5 h-3.5" />,
    },
    {
      id: 'preview',
      label: 'Vista previa',
      icon: <PlaySquare className="w-3.5 h-3.5" />,
      badge: result ? (result.type === 'video' ? 'Video' : 'Foto') : undefined,
    },
  ];

  if (!isStudioOpen) {
    // Still render overlay if user has framing guide active in background
    return <CaptureFramingOverlay />;
  }

  return (
    <>
      <CaptureFramingOverlay />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-[16px] pointer-events-auto select-none font-sans animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isRecording) {
            setStudioOpen(false);
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-studio-modal-title"
      >
        <div
          className="w-full max-w-lg rounded-[28px] p-5 sm:p-6 relative flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 shadow-2xl border border-white/15"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(14, 18, 28, 0.85) 50%, rgba(5, 7, 12, 0.95) 100%)',
            backdropFilter: `${glassBlur} ${glassSaturate}`,
            WebkitBackdropFilter: `${glassBlur} ${glassSaturate}`,
            boxShadow:
              '0 32px 80px -12px rgba(0, 0, 0, 0.9), inset 0 1px 1.5px rgba(255, 255, 255, 0.25)',
            contain: 'layout paint style',
            isolation: 'isolate',
          }}
        >
          {/* Specular Rim Light */}
          <div className="absolute top-0 inset-x-8 h-px pointer-events-none bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

          {/* ── 1. Modal Header ── */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="capture-studio-modal-title"
                    className="text-white font-bold text-base tracking-tight"
                  >
                    Aura3D Capture Studio
                  </h2>
                  {isRecording && (
                    <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      REC {formatTime(elapsedSeconds)}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-[11px] mt-0.5">
                  Fotos 4K ultra nítidas y video 60 FPS con encuadre social
                </p>
              </div>
            </div>

            <button
              onClick={() => setStudioOpen(false)}
              disabled={isRecording}
              className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Cerrar Capture Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── 2. Segmented Mode Tabs ── */}
          <div className="pt-3 pb-2 flex-shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/10">
              {TABS.map((tab) => {
                const isActive = session.mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    disabled={isRecording && tab.id !== 'video'}
                    className={`relative flex-1 min-w-0 py-2 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-white/20 text-white shadow-md border border-white/25'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                          isRecording
                            ? 'bg-rose-500/30 text-rose-200 border-rose-400/40 animate-pulse'
                            : 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3. Error Banner ── */}
          {errorMessage && (
            <div className="p-2.5 mb-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-white/60 hover:text-white text-[10px] font-bold underline cursor-pointer ml-2"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* ── 4. Tab Body Content ── */}
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 custom-scrollbar">
            {session.mode === 'photo' && <PhotoCapture />}
            {session.mode === 'video' && <VideoCapture />}
            {session.mode === 'preview' && <CapturePreview />}
          </div>
        </div>
      </div>
    </>
  );
};

export default CaptureStudio;
