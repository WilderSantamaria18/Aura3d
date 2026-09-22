import React, { useState, useEffect, useRef } from 'react';
import { Video, Square, ChevronDown, Download, Sparkles, Smartphone, Monitor, Check, Sliders } from 'lucide-react';
import { videoRecorder, type VideoAspectRatio } from '../../services/videoRecorderService';
import { usePlayerStore } from '../../stores/playerStore';
import { useRecorderStore } from '../../store/recorderStore';

export interface VideoRecorderButtonProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export const VideoRecorderButton: React.FC<VideoRecorderButtonProps> = ({
  isOpen: controlledIsOpen,
  onToggle,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [targetDuration, setTargetDuration] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [includeTrackCard, setIncludeTrackCard] = useState(true);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isMenuOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const setCaptureStudioOpen = usePlayerStore((s) => s.setCaptureStudioOpen);
  const setCaptureAspectRatio = usePlayerStore((s) => s.setCaptureAspectRatio);
  const storeAspectRatio = usePlayerStore((s) => s.captureAspectRatio);

  const toggleMenu = () => {
    if (onToggle) onToggle();
    else setInternalIsOpen((v) => !v);
  };

  const closeMenu = () => {
    if (onClose) onClose();
    else setInternalIsOpen(false);
  };

  useEffect(() => {
    if (storeAspectRatio) {
      setAspectRatio(storeAspectRatio as VideoAspectRatio);
    }
  }, [storeAspectRatio]);

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
        closeMenu();
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleStart = async (limitSec?: number, customRatio?: VideoAspectRatio) => {
    closeMenu();
    const chosenRatio = customRatio || aspectRatio;
    if (customRatio) setAspectRatio(customRatio);
    setTargetDuration(limitSec || null);

    const started = await videoRecorder.startRecording({
      durationLimitSec: limitSec,
      aspectRatio: chosenRatio,
      includeTrackCard,
      onFinish: (_url, fileName) => {
        setDownloadSuccess(`Descargado: ${fileName}`);
        setTargetDuration(null);
        setTimeout(() => setDownloadSuccess(null), 4500);
      },
      onError: (err) => {
        setTargetDuration(null);
        if (!err.message?.includes('canceló')) {
          alert(`Aviso de grabación: ${err.message}`);
        }
      },
    });

    if (!started) {
      setTargetDuration(null);
    }
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

  // ── 1. Active Recording Mode: Apple Dynamic Island Capsule ─────────────────────
  if (isRecording) {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-200 shadow-[0_0_24px_rgba(239,68,68,0.35)] backdrop-blur-2xl select-none animate-in fade-in zoom-in-95 duration-200">
        <div className="relative flex items-center justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
          <span className="absolute w-4 h-4 rounded-full bg-red-500/30 animate-ping" />
        </div>
        <span className="text-xs font-semibold font-mono tracking-wider text-red-100">
          REC {formatTime(elapsedSec)}
          {targetDuration ? ` / ${formatTime(targetDuration)}` : ''}
        </span>
        <button
          onClick={handleStop}
          className="w-6 h-6 rounded-full bg-red-500/25 hover:bg-red-500/45 border border-red-400/40 flex items-center justify-center text-white transition-transform active:scale-90 shadow-sm"
          title="Detener y descargar video MP4"
          aria-label="Detener grabación"
        >
          <Square className="w-2.5 h-2.5 fill-current" />
        </button>
      </div>
    );
  }

  // ── 2. Idle State: Apple Liquid Glass Capsule + Frosted Flyout ──────────────────
  return (
    <div className="relative" ref={menuRef}>
      {/* iOS Liquid Glass Pill Button */}
      <div className="flex items-center">
        <button
          onClick={toggleMenu}
          className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass border border-white/15 border-t-white/30 text-white/90 hover:text-white shadow-lg backdrop-blur-2xl transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
          title="Opciones de grabación de pantalla (MP4)"
          aria-label="Opciones de grabación de pantalla"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
          <Video className="w-3.5 h-3.5 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
          <span className="text-[11px] font-semibold tracking-tight text-white/90">Grabar</span>
          <span className="text-[9px] font-medium text-white/60 px-1.5 py-0.2 rounded-full bg-white/10 border border-white/10">
            {aspectRatio}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-white/50 group-hover:text-white/80 transition-transform duration-200 ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* iOS Liquid Glass Card Popup Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-[22px] p-3.5 z-50 text-white select-none liquid-glass liquid-glass-card border border-white/20 border-t-white/35 backdrop-blur-3xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-300">
                <Sparkles className="w-3 h-3" />
              </span>
              <div>
                <div className="text-xs font-bold text-white tracking-tight">Grabar Pantalla</div>
                <div className="text-[9px] text-white/45">Exportación directa MP4</div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/25">
              {aspectRatio}
            </span>
          </div>

          {/* Aura3D Social Suite Pro Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
              useRecorderStore.getState().openModal('record');
            }}
            className="w-full mb-3 p-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 hover:border-purple-400 text-white flex items-center justify-between transition-all group cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-purple-200">Social Content Studio</div>
                <div className="text-[9px] text-white/60">Captura 9:16, Recorte y Story Cards</div>
              </div>
            </div>
            <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded-md border border-purple-400/30">
              ABRIR
            </span>
          </button>

          {/* Aspect Ratio Selector (Apple Segmented Control) */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/45 px-0.5">
              <span>Proporción de Video</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  setCaptureStudioOpen(true);
                }}
                className="text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer font-bold lowercase first-letter:uppercase"
              >
                <Sliders className="w-3 h-3" />
                <span>Ajustar encuadre</span>
              </button>
            </div>
            <div className="p-1 rounded-xl bg-black/40 border border-white/10 backdrop-blur-xl grid grid-cols-4 gap-1">
              {(['16:9', '9:16', '1:1', '4:5'] as const).map((ratio) => {
                const isActive = aspectRatio === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAspectRatio(ratio as VideoAspectRatio);
                      setCaptureAspectRatio(ratio);
                    }}
                    className={`py-1.5 rounded-lg text-[10px] font-semibold transition-all text-center cursor-pointer ${
                      isActive
                        ? 'bg-white/20 text-white shadow-sm border border-white/25 backdrop-blur-md'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    {ratio}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Social Media Track Card Toggle (Authentic iOS Switch) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIncludeTrackCard(!includeTrackCard);
            }}
            className="mb-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white/90">Tarjeta de canción</span>
              <span className="text-[10px] text-white/45">Superponer título y carátula</span>
            </div>
            <div
              className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                includeTrackCard ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  includeTrackCard ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Quick Presets (Apple Grouped Cell List) */}
          <div className="space-y-1 mb-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 px-0.5 mb-1">
              Plantillas Rápidas
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden divide-y divide-white/[0.06]">
              {/* Reel / TikTok 9:16 */}
              <button
                onClick={() => handleStart(15, '9:16')}
                className="w-full flex items-center justify-between p-2 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Reel / TikTok</div>
                    <div className="text-[9px] text-white/45">Vertical 9:16</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                  15s
                </span>
              </button>

              {/* Instagram Story 9:16 */}
              <button
                onClick={() => handleStart(30, '9:16')}
                className="w-full flex items-center justify-between p-2 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Historia Instagram</div>
                    <div className="text-[9px] text-white/45">Vertical 9:16</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                  30s
                </span>
              </button>

              {/* PC / YouTube Clip 16:9 */}
              <button
                onClick={() => handleStart(30, '16:9')}
                className="w-full flex items-center justify-between p-2 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Clip Panorámico</div>
                    <div className="text-[9px] text-white/45">Horizontal 16:9</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  30s
                </span>
              </button>

              {/* Free Recording */}
              <button
                onClick={() => handleStart(undefined, aspectRatio)}
                className="w-full flex items-center justify-between p-2 hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Grabación Libre</div>
                    <div className="text-[9px] text-white/45">Sin límite de tiempo</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Manual
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Feedback Toast (Apple Dynamic Toast) */}
      {downloadSuccess && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#0a1520]/95 border border-emerald-500/40 text-emerald-200 text-xs font-medium shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Check className="w-3 h-3" />
          </div>
          <span className="truncate max-w-xs">{downloadSuccess}</span>
        </div>
      )}
    </div>
  );
};

export default VideoRecorderButton;
