import React, { useState, useEffect } from 'react';
import {
  Camera,
  Video,
  X,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Disc,
  Layers,
  Monitor,
  Film,
  Sliders,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { captureVisualizerSnapshot, type SnapshotAspectRatio } from '../../utils/snapshotCapture';
import { videoRecorder, type VideoAspectRatio, type VideoQuality, type VideoSourceMode } from '../../services/videoRecorderService';

interface AspectRatioOption {
  id: '16:9' | '9:16' | '1:1' | '4:5';
  label: string;
  sub: string;
  iconRatio: string;
  badge: string;
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: '16:9',
    label: '16:9 Panorámico',
    sub: 'YouTube / Escritorio',
    iconRatio: 'w-7 h-4',
    badge: '1920×1080',
  },
  {
    id: '9:16',
    label: '9:16 Vertical',
    sub: 'TikTok / Reels / Shorts',
    iconRatio: 'w-4 h-7',
    badge: '1080×1920',
  },
  {
    id: '1:1',
    label: '1:1 Cuadrado',
    sub: 'Instagram / Carátula',
    iconRatio: 'w-5 h-5',
    badge: '1080×1080',
  },
  {
    id: '4:5',
    label: '4:5 Retrato',
    sub: 'Feed Instagram / Social',
    iconRatio: 'w-4 h-5',
    badge: '1080×1350',
  },
];

export const StudioCaptureCard: React.FC = () => {
  const {
    isCaptureStudioOpen,
    setCaptureStudioOpen,
    captureAspectRatio,
    setCaptureAspectRatio,
    isFramingGuideActive,
    setFramingGuideActive,
    toggleFramingGuide,
    captureQuality,
    setCaptureQuality,
    captureSourceMode,
    setCaptureSourceMode,
    isLucid,
    lucidTheme,
    lucidPrimaryColor,
    currentTrack,
  } = usePlayerStore();

  const [isRecording, setIsRecording] = useState(videoRecorder.isRecording());
  const [elapsedSec, setElapsedSec] = useState(videoRecorder.getElapsedSeconds());
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const activeColor = isLucid
    ? lucidPrimaryColor || lucidTheme.primary || '#00e5ff'
    : '#00e5ff';

  // Subscribe to videoRecorder state
  useEffect(() => {
    const unsubscribe = videoRecorder.subscribeState((recording, sec) => {
      setIsRecording(recording);
      setElapsedSec(sec);
    });
    return () => unsubscribe();
  }, []);

  if (!isCaptureStudioOpen) return null;

  // Format elapsed time (MM:SS)
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger Snapshot
  const handleTakeSnapshot = async () => {
    setIsCapturingSnapshot(true);
    setSuccessFeedback(null);
    try {
      const ok = await captureVisualizerSnapshot({
        resolution: captureQuality,
        aspectRatio: captureAspectRatio as SnapshotAspectRatio,
        trackTitle: currentTrack?.title || 'Aura3D_Visualizer',
        format: 'png',
        includeWatermark: true,
      });
      if (ok) {
        setSuccessFeedback('¡Captura guardada en alta resolución!');
        setTimeout(() => setSuccessFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Error al capturar:', err);
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  // Toggle Video Recording
  const handleToggleRecording = async () => {
    if (isRecording) {
      videoRecorder.stopRecording();
      setSuccessFeedback('¡Video exportado y descargado!');
      setTimeout(() => setSuccessFeedback(null), 3500);
    } else {
      setSuccessFeedback(null);
      const ok = await videoRecorder.startRecording({
        aspectRatio: captureAspectRatio as VideoAspectRatio,
        quality: captureQuality as VideoQuality,
        sourceMode: captureSourceMode as VideoSourceMode,
        includeTrackCard: true,
      });
      if (!ok) {
        setSuccessFeedback('No se pudo iniciar la grabación.');
        setTimeout(() => setSuccessFeedback(null), 3000);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-[24px] saturate-[140%] pointer-events-auto select-none font-sans animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRecording) {
          setCaptureStudioOpen(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-capture-title"
    >
      <div
        className="w-full max-w-lg rounded-[28px] p-5 sm:p-6 relative flex flex-col max-h-[92vh] overflow-hidden transition-all duration-300 shadow-2xl border border-white/15"
        style={{
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(16, 20, 32, 0.75) 50%, rgba(6, 8, 14, 0.9) 100%)',
          backdropFilter: 'blur(48px) saturate(190%) contrast(105%)',
          WebkitBackdropFilter: 'blur(48px) saturate(190%) contrast(105%)',
          boxShadow: '0 32px 80px -12px rgba(0, 0, 0, 0.9), inset 0 1px 1.5px rgba(255, 255, 255, 0.25)',
        }}
      >
        {/* Specular Liquid Rim Top Line */}
        <div
          className="absolute top-0 inset-x-8 h-px pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${activeColor}99, transparent)`,
          }}
        />

        {/* ── 1. Header ── */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border border-white/15"
              style={{
                backgroundColor: `${activeColor}18`,
                color: activeColor,
              }}
            >
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="studio-capture-title" className="text-white font-bold text-base tracking-tight">
                  Studio Capture & REC
                </h2>
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    REC {formatTime(elapsedSec)}
                  </span>
                )}
              </div>
              <p className="text-white/60 text-xs font-sans mt-0.5">
                Captura 4K sin pantalla negra y grabación 60 FPS con encuadre
              </p>
            </div>
          </div>

          <button
            onClick={() => setCaptureStudioOpen(false)}
            disabled={isRecording}
            className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Cerrar Studio Capture"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2. Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {/* Feedback Banner */}
          {successFeedback && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successFeedback}</span>
            </div>
          )}

          {/* ── Proporción de Aspecto (Aspect Ratio Selector) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                Proporción de Encuadre
              </label>
              <span className="text-[11px] font-mono text-cyan-300 font-semibold">
                {captureAspectRatio}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((opt) => {
                const isSelected = captureAspectRatio === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setCaptureAspectRatio(opt.id)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-white/20 border-white/40 shadow-md ring-1 ring-white/30 text-white'
                        : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${activeColor}22`,
                            borderColor: `${activeColor}70`,
                          }
                        : undefined
                    }
                  >
                    {/* Visual Aspect Ratio Miniature Icon Box */}
                    <div className="h-9 flex items-center justify-center mb-1.5">
                      <div
                        className={`${opt.iconRatio} rounded-sm border-2 transition-all ${
                          isSelected
                            ? 'border-white bg-white/20 shadow-sm'
                            : 'border-white/40 bg-white/5 group-hover:border-white/70'
                        }`}
                        style={isSelected ? { borderColor: activeColor } : undefined}
                      />
                    </div>

                    <div>
                      <div className="text-xs font-bold leading-tight">{opt.id}</div>
                      <div className="text-[10px] text-white/50 leading-tight truncate mt-0.5">
                        {opt.sub}
                      </div>
                      <div className="text-[9px] font-mono text-white/40 mt-1">
                        {opt.badge}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Miniature Crop Preview & On-Screen Guide Toggle ── */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Live aspect ratio miniature preview container */}
              <div className="w-16 h-11 rounded-lg bg-black/60 border border-white/15 relative flex items-center justify-center overflow-hidden flex-shrink-0">
                {/* Visualizer silhouette placeholder */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-transparent" />

                {/* Framed Crop Area */}
                <div
                  className="border transition-all duration-300"
                  style={{
                    borderColor: activeColor,
                    backgroundColor: `${activeColor}20`,
                    width:
                      captureAspectRatio === '9:16'
                        ? '24px'
                        : captureAspectRatio === '1:1'
                        ? '38px'
                        : captureAspectRatio === '4:5'
                        ? '32px'
                        : '56px',
                    height:
                      captureAspectRatio === '9:16'
                        ? '40px'
                        : captureAspectRatio === '1:1'
                        ? '38px'
                        : captureAspectRatio === '4:5'
                        ? '40px'
                        : '32px',
                  }}
                />
              </div>

              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Guía de recorte en pantalla</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isFramingGuideActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Muestra las bandas negras de encuadre sobre el motor 3D
                </p>
              </div>
            </div>

            <button
              onClick={toggleFramingGuide}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isFramingGuideActive
                  ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10'
              }`}
              style={
                isFramingGuideActive
                  ? {
                      backgroundColor: `${activeColor}30`,
                      borderColor: `${activeColor}80`,
                      color: '#ffffff',
                    }
                  : undefined
              }
            >
              {isFramingGuideActive ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visible</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Oculta</span>
                </>
              )}
            </button>
          </div>

          {/* ── Calidad y Modo de Captura ── */}
          <div className="grid grid-cols-2 gap-2">
            {/* Calidad / Resolución */}
            <div className="p-3 rounded-2xl bg-black/35 border border-white/10 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                Resolución
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setCaptureQuality('1080p')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    captureQuality === '1080p'
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'text-white/60 hover:text-white bg-white/5'
                  }`}
                  style={
                    captureQuality === '1080p'
                      ? { backgroundColor: `${activeColor}25`, borderColor: `${activeColor}60` }
                      : undefined
                  }
                >
                  1080p FHD
                </button>
                <button
                  onClick={() => setCaptureQuality('4k')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    captureQuality === '4k'
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'text-white/60 hover:text-white bg-white/5'
                  }`}
                  style={
                    captureQuality === '4k'
                      ? { backgroundColor: `${activeColor}25`, borderColor: `${activeColor}60` }
                      : undefined
                  }
                >
                  4K UHD
                </button>
              </div>
            </div>

            {/* Fuente de Grabación */}
            <div className="p-3 rounded-2xl bg-black/35 border border-white/10 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                Modo de Entrada
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setCaptureSourceMode('direct_canvas')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                    captureSourceMode === 'direct_canvas'
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'text-white/60 hover:text-white bg-white/5'
                  }`}
                  style={
                    captureSourceMode === 'direct_canvas'
                      ? { backgroundColor: `${activeColor}25`, borderColor: `${activeColor}60` }
                      : undefined
                  }
                  title="Motor 3D directo sin popups del navegador"
                >
                  Motor 3D
                </button>
                <button
                  onClick={() => setCaptureSourceMode('screen_tab')}
                  className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                    captureSourceMode === 'screen_tab'
                      ? 'bg-white/25 text-white border border-white/30'
                      : 'text-white/60 hover:text-white bg-white/5'
                  }`}
                  style={
                    captureSourceMode === 'screen_tab'
                      ? { backgroundColor: `${activeColor}25`, borderColor: `${activeColor}60` }
                      : undefined
                  }
                  title="Grabar pantalla completa o pestaña con UI"
                >
                  Pestaña UI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Footer Action Buttons ── */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2.5 flex-shrink-0">
          {/* Snapshot Button */}
          <button
            onClick={handleTakeSnapshot}
            disabled={isCapturingSnapshot || isRecording}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/15 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <Camera className="w-4 h-4 text-cyan-300" />
            <span>{isCapturingSnapshot ? 'Capturando...' : 'Tomar Foto'}</span>
          </button>

          {/* Record Video Button */}
          <button
            onClick={handleToggleRecording}
            disabled={isCapturingSnapshot}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border active:scale-95 transition-all cursor-pointer shadow-lg ${
              isRecording
                ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 border-rose-500/60 shadow-rose-500/20'
                : 'text-black border-transparent shadow-cyan-500/25'
            }`}
            style={
              !isRecording
                ? {
                    backgroundColor: activeColor,
                    color: '#000000',
                  }
                : undefined
            }
          >
            {isRecording ? (
              <>
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 animate-pulse" />
                <span>Detener ({formatTime(elapsedSec)})</span>
              </>
            ) : (
              <>
                <Disc className="w-4 h-4 text-black animate-spin-slow" />
                <span>Grabar Video (REC)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioCaptureCard;
