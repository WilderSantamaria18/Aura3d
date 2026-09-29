import React from 'react';
import {
  Video,
  Smartphone,
  Monitor,
  Disc,
  Square,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { useCaptureStore } from '../store/captureStore';
import { captureController } from '../controller/CaptureController';
import type { CaptureAspectRatio } from '../types';

const ASPECT_RATIOS: {
  id: CaptureAspectRatio;
  label: string;
  iconRatio: string;
}[] = [
  { id: '16:9', label: '16:9', iconRatio: 'w-6 h-3.5' },
  { id: '9:16', label: '9:16', iconRatio: 'w-3.5 h-6' },
  { id: '1:1', label: '1:1', iconRatio: 'w-4 h-4' },
  { id: '4:5', label: '4:5', iconRatio: 'w-3.5 h-4.5' },
];

export const VideoCapture: React.FC = () => {
  const {
    session,
    elapsedSeconds,
    setAspectRatio,
    setResolution,
    setSource,
    setDurationLimitSec,
    setIncludeAudio,
  } = useCaptureStore();

  const isRecording = session.status === 'recording';
  const isPreparing = session.status === 'preparing';

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      await captureController.stopRecording();
    } else {
      await captureController.startRecording();
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Proporción de Video (Aspect Ratio) ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/80">
          <span>Proporción de Video</span>
          <span className="text-[11px] font-mono text-cyan-300">{session.aspectRatio}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((opt) => {
            const isSelected = session.aspectRatio === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setAspectRatio(opt.id)}
                disabled={isRecording}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400/60 shadow-md text-white'
                    : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white'
                }`}
              >
                <div
                  className={`${opt.iconRatio} rounded-sm border-2 ${
                    isSelected ? 'border-cyan-300 bg-cyan-400/20' : 'border-white/40'
                  }`}
                />
                <span className="text-[11px] font-bold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Duración / Plantillas Rápidas ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
          Límite de Duración
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '15s Reel', sec: 15 },
            { label: '30s Story', sec: 30 },
            { label: '60s Clip', sec: 60 },
            { label: 'Manual', sec: undefined },
          ].map((item) => {
            const isSelected = session.durationLimitSec === item.sec;
            return (
              <button
                key={item.label}
                onClick={() => setDurationLimitSec(item.sec)}
                disabled={isRecording}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'bg-cyan-500/25 text-white border border-cyan-400/50 shadow-sm'
                    : 'bg-white/5 border border-white/5 text-white/60 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Calidad y Fuente de Entrada ── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Fuente */}
        <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
            Fuente
          </label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setSource('direct_canvas')}
              disabled={isRecording}
              className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                session.source === 'direct_canvas'
                  ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                  : 'text-white/60 hover:text-white bg-white/5'
              }`}
              title="Captura 60 FPS directa del motor 3D sin popups"
            >
              Motor 3D
            </button>
            <button
              onClick={() => setSource('screen_tab')}
              disabled={isRecording}
              className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                session.source === 'screen_tab'
                  ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                  : 'text-white/60 hover:text-white bg-white/5'
              }`}
              title="Grabar pantalla completa o pestaña con UI"
            >
              Pestaña UI
            </button>
          </div>
        </div>

        {/* Resolución */}
        <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
            Resolución
          </label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setResolution('1080p')}
              disabled={isRecording}
              className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                session.resolution === '1080p'
                  ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                  : 'text-white/60 hover:text-white bg-white/5'
              }`}
            >
              1080p 60F
            </button>
            <button
              onClick={() => setResolution('4k')}
              disabled={isRecording}
              className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                session.resolution === '4k'
                  ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                  : 'text-white/60 hover:text-white bg-white/5'
              }`}
            >
              4K UHD
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Botón de Grabación Principal ── */}
      <button
        onClick={handleToggleRecord}
        disabled={isPreparing}
        className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed ${
          isRecording
            ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 border-rose-500/60 shadow-rose-500/20 animate-pulse'
            : 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black border-transparent shadow-rose-500/25'
        }`}
      >
        {isRecording ? (
          <>
            <Square className="w-4 h-4 fill-current text-rose-300" />
            <span>
              Detener Grabación ({formatTime(elapsedSeconds)}
              {session.durationLimitSec ? ` / ${formatTime(session.durationLimitSec)}` : ''})
            </span>
          </>
        ) : (
          <>
            <Disc className="w-4 h-4 text-black animate-spin-slow" />
            <span>
              {isPreparing ? 'Iniciando Grabador...' : 'Iniciar Grabación (REC)'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
