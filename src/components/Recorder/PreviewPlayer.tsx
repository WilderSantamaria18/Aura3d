import React, { useState } from 'react';
import { ArrowRight, Eye, Film, Pause, Play, RotateCcw, Scissors, Volume2, VolumeX } from 'lucide-react';
import { useRecorderStore } from '../../store/recorderStore';
import { useVideoPreview } from '../../hooks/useVideoPreview';
import { FOCUS_RING } from '../Cards/controls';

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const d = Math.floor((sec % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${d}`;
};

export const PreviewPlayer: React.FC = () => {
  const recordedBlob = useRecorderStore((s) => s.recordedBlob);
  const setActiveTab = useRecorderStore((s) => s.setActiveTab);
  const resetRecording = useRecorderStore((s) => s.resetRecording);
  const aspectRatio = useRecorderStore((s) => s.aspectRatio);

  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    isMuted,
    volume,
    trimStart,
    trimEnd,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setTrimRange,
    resetTrim,
  } = useVideoPreview();

  const [showSafeZones, setShowSafeZones] = useState(false);

  if (!recordedBlob) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-white/50">
        <Film className="h-12 w-12 stroke-[1.2] text-white/30" />
        <p className="text-sm font-medium text-white/70">Todavía no hay ninguna grabación.</p>
        <p className="text-xs text-white/40">Graba un clip y aparecerá aquí para revisarlo.</p>
        <button
          type="button"
          onClick={() => setActiveTab('record')}
          className={`mt-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/25 ${FOCUS_RING}`}
        >
          Ir a Grabar
        </button>
      </div>
    );
  }

  const isPortrait = aspectRatio === '9:16' || aspectRatio === '4:5';
  const chip = `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${FOCUS_RING}`;

  return (
    <div className="flex flex-col gap-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={showSafeZones}
            onClick={() => setShowSafeZones((v) => !v)}
            className={`${chip} ${
              showSafeZones
                ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                : 'border-white/12 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Zonas de Instagram
          </button>
          <button
            type="button"
            onClick={resetTrim}
            className={`${chip} border-white/12 bg-white/[0.05] text-white/65 hover:bg-white/10 hover:text-white`}
          >
            <Scissors className="h-3.5 w-3.5" />
            Quitar marcas
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-white/55">
          <span>Velocidad</span>
          {[1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              aria-pressed={playbackRate === rate}
              onClick={() => setPlaybackRate(rate)}
              className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors ${FOCUS_RING} ${
                playbackRate === rate
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-200'
                  : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white'
              }`}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex max-h-[460px] min-h-[300px] items-center justify-center rounded-3xl border border-white/12 bg-black/60 p-3 shadow-2xl">
        <div
          className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-black ${
            isPortrait ? 'aspect-[9/16] w-[230px]' : 'aspect-video w-full'
          }`}
        >
          <video ref={videoRef} playsInline className="h-full w-full object-contain" onClick={togglePlay} />
          {showSafeZones && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between" aria-hidden="true">
              <div className="flex h-[13.5%] items-end justify-center border-b border-dashed border-rose-300/60 bg-rose-500/20 pb-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-100">Perfil y progreso</span>
              </div>
              <div className="flex h-[20%] items-start justify-center border-t border-dashed border-rose-300/60 bg-rose-500/20 pt-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-100">Responder</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between font-mono text-xs text-white/70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          aria-label="Posición del vídeo"
          min="0"
          max={duration || 1}
          step="0.05"
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className={`h-1.5 w-full cursor-pointer rounded-lg accent-violet-400 ${FOCUS_RING}`}
        />

        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-white/50">
              <span>Marca de inicio</span>
              <span className="font-mono">{formatTime(trimStart)}</span>
            </div>
            <input
              type="range"
              aria-label="Marca de inicio"
              min="0"
              max={Math.max(0, trimEnd - 0.5)}
              step="0.1"
              value={trimStart}
              onChange={(e) => setTrimRange(parseFloat(e.target.value), trimEnd)}
              className={`h-1 w-full cursor-pointer accent-indigo-400 ${FOCUS_RING}`}
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-white/50">
              <span>Marca de fin</span>
              <span className="font-mono">{formatTime(trimEnd)}</span>
            </div>
            <input
              type="range"
              aria-label="Marca de fin"
              min={Math.min(duration, trimStart + 0.5)}
              max={duration || 1}
              step="0.1"
              value={trimEnd}
              onChange={(e) => setTrimRange(trimStart, parseFloat(e.target.value))}
              className={`h-1 w-full cursor-pointer accent-indigo-400 ${FOCUS_RING}`}
            />
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          Marca el tramo que quieres conservar. Para guardarlo recortado, ve a Exportar y pulsa «Aplicar recorte».
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 active:scale-95 ${FOCUS_RING}`}
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
              className={`text-white/70 transition-colors hover:text-white ${FOCUS_RING}`}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              aria-label="Volumen"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className={`h-1 w-20 cursor-pointer accent-white ${FOCUS_RING}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetRecording();
              setActiveTab('record');
            }}
            className={`flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Grabar de nuevo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-900/40 transition-all hover:brightness-110 active:scale-[0.99] ${FOCUS_RING}`}
          >
            Ir a exportar
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
