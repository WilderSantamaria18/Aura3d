import React, { useState, useEffect, useRef } from 'react';
import { Video, Square, ChevronDown, Download } from 'lucide-react';
import { videoRecorder } from '../../services/videoRecorderService';

export const VideoRecorderButton: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [targetDuration, setTargetDuration] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = videoRecorder.subscribeState((rec, sec) => {
      setIsRecording(rec);
      setElapsedSec(sec);
    });
    return unsub;
  }, []);

  // Click outside to close preset menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleStart = (limitSec?: number) => {
    setIsMenuOpen(false);
    setTargetDuration(limitSec || null);
    videoRecorder.startRecording({
      durationLimitSec: limitSec,
      onFinish: (_url, fileName) => {
        setDownloadSuccess(`Descargado: ${fileName}`);
        setTargetDuration(null);
        setTimeout(() => setDownloadSuccess(null), 4000);
      },
      onError: (err) => {
        alert(`Error al grabar: ${err.message}`);
        setTargetDuration(null);
      },
    });
  };

  const handleStop = () => {
    videoRecorder.stopRecording();
    setTargetDuration(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 animate-pulse select-none">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span className="text-[11px] font-mono font-medium tracking-wider">
          REC {formatTime(elapsedSec)}
          {targetDuration ? ` / ${formatTime(targetDuration)}` : ''}
        </span>
        <button
          onClick={handleStop}
          className="ml-1 p-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
          title="Detener y descargar clip"
          aria-label="Detener grabación"
        >
          <Square className="w-3 h-3 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center">
        {/* Main REC Button */}
        <button
          onClick={() => handleStart(15)}
          className="p-1.5 rounded-l-lg transition-colors border-y border-l border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.04] flex items-center gap-1"
          title="Grabar clip de 15s para redes"
          aria-label="Grabar video"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono hidden md:inline uppercase text-white/40">Rec</span>
        </button>

        {/* Dropdown Menu Arrow */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-1.5 rounded-r-lg transition-colors border border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
          title="Opciones de grabación"
          aria-label="Opciones de grabación"
        >
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Preset Dropdown */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#090D18]/95 border border-white/12 shadow-[0_12px_30px_rgba(0,0,0,0.85)] p-1.5 z-50 text-white text-xs font-mono select-none backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[10px] text-white/35 uppercase tracking-wider border-b border-white/[0.06] mb-1">
            Exportar Clip HD (60fps)
          </div>

          <button
            onClick={() => handleStart(15)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors text-left"
          >
            <span>Clip Rápido</span>
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">15 seg</span>
          </button>

          <button
            onClick={() => handleStart(30)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors text-left"
          >
            <span>Historia / Reel</span>
            <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">30 seg</span>
          </button>

          <button
            onClick={() => handleStart()}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white transition-colors text-left"
          >
            <span>Grabación Libre</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Manual</span>
          </button>
        </div>
      )}

      {/* Download Feedback Toast */}
      {downloadSuccess && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Download className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate max-w-xs">{downloadSuccess}</span>
        </div>
      )}
    </div>
  );
};
