import React from 'react';
import { Camera, Eye, EyeOff, Sparkles, Sliders } from 'lucide-react';
import { useCaptureStore } from '../store/captureStore';
import { captureController } from '../controller/CaptureController';
import type { CaptureAspectRatio } from '../types';

const ASPECT_RATIOS: {
  id: CaptureAspectRatio;
  label: string;
  sub: string;
  iconRatio: string;
  badge: string;
}[] = [
  {
    id: '16:9',
    label: '16:9 Panorámico',
    sub: 'YouTube / PC',
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

export const PhotoCapture: React.FC = () => {
  const {
    session,
    setAspectRatio,
    setResolution,
    setIncludeWatermark,
    toggleFramingGuide,
  } = useCaptureStore();

  const isPreparing = session.status === 'preparing';

  const handleShoot = async () => {
    await captureController.takeSnapshot();
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Aspect Ratio Selector ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-white/80">
            Proporción de Encuadre
          </label>
          <span className="text-[11px] font-mono text-cyan-300 font-semibold">
            {session.aspectRatio}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((opt) => {
            const isSelected = session.aspectRatio === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setAspectRatio(opt.id)}
                className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400/60 shadow-md ring-1 ring-cyan-400/30 text-white'
                    : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white/70 hover:text-white'
                }`}
              >
                <div className="h-8 flex items-center justify-center mb-1">
                  <div
                    className={`${opt.iconRatio} rounded-sm border-2 transition-all ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-400/20 shadow-sm'
                        : 'border-white/40 bg-white/5 group-hover:border-white/70'
                    }`}
                  />
                </div>

                <div>
                  <div className="text-xs font-bold leading-tight">{opt.id}</div>
                  <div className="text-[10px] text-white/50 leading-tight truncate mt-0.5">
                    {opt.sub}
                  </div>
                  <div className="text-[9px] font-mono text-white/40 mt-1">
                    {session.resolution === '4k' ? '4K UHD' : opt.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Resolución & Guía de Encuadre ── */}
      <div className="grid grid-cols-2 gap-2">
        {/* Calidad */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
            Resolución
          </label>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setResolution('1080p')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                session.resolution === '1080p'
                  ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                  : 'text-white/60 hover:text-white bg-white/5'
              }`}
            >
              1080p FHD
            </button>
            <button
              onClick={() => setResolution('4k')}
              className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                session.resolution === '4k'
                  ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                  : 'text-white/60 hover:text-white bg-white/5'
              }`}
            >
              4K UHD
            </button>
          </div>
        </div>

        {/* Guía en pantalla */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-white/60">
            Guía de Recorte
          </label>
          <button
            onClick={toggleFramingGuide}
            className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              session.framingGuide
                ? 'bg-cyan-500/25 text-white border border-cyan-400/50'
                : 'text-white/60 hover:text-white bg-white/5'
            }`}
          >
            {session.framingGuide ? (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
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
      </div>

      {/* ── 3. Marca de agua toggle ── */}
      <div
        onClick={() => setIncludeWatermark(!session.includeWatermark)}
        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors flex items-center justify-between cursor-pointer"
      >
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white/90">Tarjeta de canción y firma</span>
          <span className="text-[10px] text-white/45">Superponer título de audio y logotipo Aura</span>
        </div>
        <div
          className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
            session.includeWatermark ? 'bg-cyan-500' : 'bg-white/20'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
              session.includeWatermark ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>

      {/* ── 4. Botón de Disparo ── */}
      <button
        onClick={handleShoot}
        disabled={isPreparing}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Camera className="w-4 h-4" />
        <span>{isPreparing ? 'Capturando 4K...' : `Tomar Foto (${session.resolution.toUpperCase()})`}</span>
      </button>
    </div>
  );
};
