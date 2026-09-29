import React, { useRef, useState, useEffect } from 'react';
import {
  Download,
  Play,
  Pause,
  RotateCcw,
  Check,
  Scissors,
  Sparkles,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { useCaptureStore } from '../store/captureStore';
import { captureController } from '../controller/CaptureController';

export const CapturePreview: React.FC = () => {
  const {
    result,
    setMode,
    clearResult,
    trimStartSec,
    trimEndSec,
    setTrimRange,
  } = useCaptureStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (result && result.type === 'video' && result.durationSec) {
      setTrimRange(0, result.durationSec);
    }
  }, [result, setTrimRange]);

  if (!result) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40">
          <Film className="w-6 h-6" />
        </div>
        <p className="text-white/60 text-xs">No hay ninguna captura reciente para previsualizar.</p>
        <button
          onClick={() => setMode('photo')}
          className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold transition-all cursor-pointer"
        >
          Ir a Capturar
        </button>
      </div>
    );
  }

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);
    if (trimEndSec > 0 && cur >= trimEndSec) {
      videoRef.current.pause();
      videoRef.current.currentTime = trimStartSec;
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    captureController.downloadResult(result);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleNewCapture = () => {
    clearResult();
    setMode(result.type === 'photo' ? 'photo' : 'video');
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* ── Visual Media Container ── */}
      <div className="relative rounded-2xl overflow-hidden bg-black/80 border border-white/15 shadow-2xl flex items-center justify-center max-h-[46vh]">
        {result.type === 'photo' ? (
          <img
            src={result.url}
            alt={result.fileName}
            className="w-full h-full max-h-[44vh] object-contain"
          />
        ) : (
          <div className="relative w-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={result.url}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full max-h-[44vh] object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {/* Play overlay button */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute w-12 h-12 rounded-full bg-black/60 border border-white/30 text-white flex items-center justify-center backdrop-blur-md hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Video Trimming Slider (Only for videos) ── */}
      {result.type === 'video' && result.durationSec && result.durationSec > 2 && (
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
            <span className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-cyan-300" />
              <span>Ajustar Inicio / Fin (Trim)</span>
            </span>
            <span className="font-mono text-cyan-300">
              {formatSec(trimStartSec)} - {formatSec(trimEndSec)} ({formatSec(trimEndSec - trimStartSec)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[9px] text-white/40 font-mono">
                <span>Inicio: {formatSec(trimStartSec)}</span>
                <span>Fin: {formatSec(trimEndSec)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, trimEndSec - 1)}
                  step={0.5}
                  value={trimStartSec}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTrimRange(val, trimEndSec);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <input
                  type="range"
                  min={trimStartSec + 1}
                  max={result.durationSec}
                  step={0.5}
                  value={trimEndSec}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTrimRange(trimStartSec, val);
                    if (videoRef.current) videoRef.current.currentTime = val;
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Metadata Pill ── */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/60">
        <span className="truncate max-w-[200px] font-mono">{result.fileName}</span>
        <span className="font-mono text-cyan-300">
          {result.dimensions.width}×{result.dimensions.height} ({result.aspectRatio})
        </span>
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleNewCapture}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Nueva Captura</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
        >
          {downloadSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-black" />
              <span>¡Descargado!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Descargar Archivo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
