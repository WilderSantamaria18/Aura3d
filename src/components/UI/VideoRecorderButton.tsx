import React, { useState, useEffect, useRef } from 'react';
import { Video, Square, ChevronDown, Download, Sparkles, Smartphone, Monitor, Film } from 'lucide-react';
import { videoRecorder, type VideoAspectRatio } from '../../services/videoRecorderService';

export const VideoRecorderButton: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [targetDuration, setTargetDuration] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [includeTrackCard, setIncludeTrackCard] = useState(true);
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

  const handleStart = async (limitSec?: number, customRatio?: VideoAspectRatio) => {
    setIsMenuOpen(false);
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

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-status-error/15 border border-status-error/40 text-status-error animate-pulse select-none min-h-11">
        <span className="w-2.5 h-2.5 rounded-pill bg-status-error animate-ping" />
        <span className="text-caption font-mono font-medium tracking-wider font-tabular">
          REC {formatTime(elapsedSec)}
          {targetDuration ? ` / ${formatTime(targetDuration)}` : ''}
        </span>
        <button
          onClick={handleStop}
          className="min-h-11 min-w-11 ml-1 p-2 rounded-control bg-status-error/20 hover:bg-status-error/40 text-white transition-colors flex items-center justify-center cursor-pointer btn-spring"
          title="Detener y descargar video MP4"
          aria-label="Detener grabación"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
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
          className="min-h-11 px-3 py-2 rounded-l-control transition-colors border-y border-l border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.04] flex items-center gap-1.5 cursor-pointer btn-spring"
          title="Grabar pestaña en MP4 (15s por defecto)"
          aria-label="Grabar video MP4"
        >
          <Video className="w-4 h-4 text-accent-cyan" />
          <span className="text-caption font-mono hidden md:inline uppercase text-text-tertiary">Rec</span>
        </button>

        {/* Dropdown Menu Arrow */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="min-h-11 min-w-11 px-2.5 py-2 rounded-r-control transition-colors border border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-white/[0.04] flex items-center justify-center cursor-pointer btn-spring"
          title="Opciones de proporción (16:9, 4:3, 1:1) y duración"
          aria-label="Opciones de grabación"
          aria-expanded={isMenuOpen}
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-fast ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Preset Dropdown */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-modal bg-surface-overlay material-thick border border-border-medium shadow-modal p-3 z-50 text-text-primary text-caption font-mono select-none animate-aura-popover">
          <div className="px-1 py-1 text-caption text-text-tertiary uppercase tracking-wider border-b border-border-subtle mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent-cyan" /> Grabar Pestaña (MP4)
            </span>
            <span className="text-accent-cyan font-bold">{aspectRatio}</span>
          </div>

          <div className="text-caption text-text-muted px-1 mb-1.5">
            Proporción de video:
          </div>

          {/* Aspect Ratio Selector Pills */}
          <div className="p-1 mb-2.5 rounded-control bg-surface-base/60 border border-border-subtle grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAspectRatio('16:9'); }}
              className={`min-h-11 py-1.5 rounded-control text-caption font-mono text-center transition-colors flex items-center justify-center cursor-pointer ${
                aspectRatio === '16:9'
                  ? 'bg-accent-cyan/25 text-accent-cyan font-semibold border border-accent-cyan/40 shadow-subtle'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Panorámico 16:9 (YouTube / PC)"
              aria-label="Proporción 16:9"
            >
              16:9
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAspectRatio('4:3'); }}
              className={`min-h-11 py-1.5 rounded-control text-caption font-mono text-center transition-colors flex items-center justify-center cursor-pointer ${
                aspectRatio === '4:3'
                  ? 'bg-accent-cyan/25 text-accent-cyan font-semibold border border-accent-cyan/40 shadow-subtle'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Clásico 4:3"
              aria-label="Proporción 4:3"
            >
              4:3
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAspectRatio('1:1'); }}
              className={`min-h-11 py-1.5 rounded-control text-caption font-mono text-center transition-colors flex items-center justify-center cursor-pointer ${
                aspectRatio === '1:1'
                  ? 'bg-accent-cyan/25 text-accent-cyan font-semibold border border-accent-cyan/40 shadow-subtle'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Cuadrado 1:1"
              aria-label="Proporción 1:1"
            >
              1:1
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAspectRatio('9:16'); }}
              className={`min-h-11 py-1.5 rounded-control text-caption font-mono text-center transition-colors flex items-center justify-center cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-accent-violet/25 text-accent-violet font-semibold border border-accent-violet/40 shadow-subtle'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Vertical 9:16"
              aria-label="Proporción 9:16"
            >
              9:16
            </button>
          </div>

          {/* Social Media Watermark Toggle */}
          <div className="mb-2.5 p-2 rounded-control bg-surface-base/60 border border-border-subtle flex items-center justify-between min-h-11">
            <span className="text-caption text-text-secondary">Tarjeta de canción:</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIncludeTrackCard(!includeTrackCard);
              }}
              className={`px-3 py-1.5 rounded-pill text-caption font-mono transition-colors cursor-pointer ${
                includeTrackCard
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                  : 'bg-white/5 text-text-muted border border-border-subtle'
              }`}
              aria-label={includeTrackCard ? 'Desactivar tarjeta de canción' : 'Activar tarjeta de canción'}
            >
              {includeTrackCard ? 'ACTIVADA' : 'DESACTIVADA'}
            </button>
          </div>

          {/* 1-Click Presets */}
          <div className="space-y-1">
            <button
              onClick={() => handleStart(15, '9:16')}
              className="w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-control hover:bg-white/[0.06] text-text-secondary hover:text-text-primary transition-colors text-left group cursor-pointer btn-spring"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-accent-violet" />
                <span className="text-caption">Reel / TikTok 9:16</span>
              </span>
              <span className="text-caption text-accent-violet bg-accent-violet/15 px-2 py-0.5 rounded-pill font-bold">15s</span>
            </button>

            <button
              onClick={() => handleStart(30, '9:16')}
              className="w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-control hover:bg-white/[0.06] text-text-secondary hover:text-text-primary transition-colors text-left group cursor-pointer btn-spring"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-accent-rose" />
                <span className="text-caption">Story Vertical 9:16</span>
              </span>
              <span className="text-caption text-accent-rose bg-accent-rose/15 px-2 py-0.5 rounded-pill font-bold">30s</span>
            </button>

            <button
              onClick={() => handleStart(30, '16:9')}
              className="w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-control hover:bg-white/[0.06] text-text-secondary hover:text-text-primary transition-colors text-left group cursor-pointer btn-spring"
            >
              <span className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-accent-cyan" />
                <span className="text-caption">Clip Panorámico 16:9</span>
              </span>
              <span className="text-caption text-accent-cyan bg-accent-cyan/15 px-2 py-0.5 rounded-pill font-bold">30s</span>
            </button>

            <button
              onClick={() => handleStart(undefined, aspectRatio)}
              className="w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-control hover:bg-white/[0.06] text-text-tertiary hover:text-text-primary transition-colors text-left cursor-pointer btn-spring"
            >
              <span className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-status-success" />
                <span className="text-caption">Grabación Libre</span>
              </span>
              <span className="text-caption text-status-success bg-status-success/10 px-2 py-0.5 rounded-pill">Manual</span>
            </button>
          </div>
        </div>
      )}

      {/* Download Feedback Toast */}
      {downloadSuccess && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-card bg-surface-dock/90 border border-status-success/40 text-status-success text-caption font-mono shadow-modal material-regular animate-aura-slide-up">
          <Download className="w-4 h-4 text-status-success shrink-0" />
          <span className="truncate max-w-xs">{downloadSuccess}</span>
        </div>
      )}
    </div>
  );
};

export default VideoRecorderButton;
