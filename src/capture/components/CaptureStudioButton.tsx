import React from 'react';
import { Film, Square, Camera, Video, ChevronDown } from 'lucide-react';
import { useCaptureStore } from '../store/captureStore';
import { captureController } from '../controller/CaptureController';

export const CaptureStudioButton: React.FC = () => {
  const { session, elapsedSeconds, isStudioOpen, toggleStudio, setStudioOpen } =
    useCaptureStore();

  const isRecording = session.status === 'recording';

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    captureController.stopRecording();
  };

  // ── 1. Recording State: Dynamic Island Capsule ──
  if (isRecording) {
    return (
      <div
        onClick={() => setStudioOpen(true)}
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)] backdrop-blur-2xl select-none animate-in fade-in cursor-pointer"
        title="Grabación en progreso - Clic para ver estudio"
      >
        <div className="relative flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="absolute w-3.5 h-3.5 rounded-full bg-rose-500/40 animate-ping" />
        </div>
        <span className="text-[11px] font-mono font-bold tracking-wider text-rose-100">
          REC {formatTime(elapsedSeconds)}
        </span>
        <button
          onClick={handleStopRecording}
          className="w-5 h-5 rounded-full bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400/40 flex items-center justify-center text-white transition-transform active:scale-90"
          title="Detener y descargar grabación"
          aria-label="Detener grabación"
        >
          <Square className="w-2 h-2 fill-current" />
        </button>
      </div>
    );
  }

  // ── 2. Idle State: Apple Liquid Glass Button ──
  return (
    <button
      onClick={toggleStudio}
      className={`group relative flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-white/90 hover:text-white shadow-lg backdrop-blur-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer ${
        isStudioOpen
          ? 'bg-cyan-500/25 border-cyan-400/50 text-white shadow-cyan-500/20'
          : 'bg-white/[0.04] border-white/15 hover:bg-white/[0.08]'
      }`}
      title="Abrir Capture Studio (Foto 4K y Video REC)"
      aria-label="Capture Studio"
    >
      <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
      <Film className="w-3.5 h-3.5 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
      <span className="text-[11px] font-semibold tracking-tight hidden min-[1700px]:inline">Capture Studio</span>
      <span className="text-[9px] font-mono font-semibold text-white/60 px-1.5 py-0.2 rounded-full bg-white/10 border border-white/10">
        {session.aspectRatio}
      </span>
    </button>
  );
};
