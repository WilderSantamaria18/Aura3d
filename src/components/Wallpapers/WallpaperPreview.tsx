import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Download, Heart, Sliders, Layers } from 'lucide-react';
import type { WallpaperPreset, WallpaperGenerationResult } from '../../types/wallpaper';
import { useWallpaperStore } from '../../stores/wallpaperStore';

interface WallpaperPreviewProps {
  item: WallpaperPreset | WallpaperGenerationResult | null;
  onClose: () => void;
  onApply: (item: WallpaperPreset | WallpaperGenerationResult) => void;
}

export const WallpaperPreview: React.FC<WallpaperPreviewProps> = ({
  item,
  onClose,
  onApply,
}) => {
  const applicationSettings = useWallpaperStore((s) => s.applicationSettings);
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const isApplied = currentWallpaper?.id === item?.id;

  const [viewMode, setViewMode] = React.useState<'original' | 'cover'>(
    item?.aspectRatio && item.aspectRatio !== '16:9' ? 'original' : 'cover'
  );

  React.useEffect(() => {
    if (item?.aspectRatio && item.aspectRatio !== '16:9') {
      setViewMode('original');
    } else {
      setViewMode('cover');
    }
  }, [item?.id, item?.aspectRatio]);

  if (!item) return null;

  const title = 'name' in item ? item.name : item.prompt;
  const description = 'description' in item ? item.description : `Generado con IA • Estilo ${item.style}`;
  const fullUrl = 'fullUrl' in item ? item.fullUrl : item.url;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = `aura3d-wallpaper-${item.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12, filter: 'blur(14px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.92, y: 12, filter: 'blur(14px)' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[28px] overflow-hidden liquid-glass liquid-glass-modal border border-white/20 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 px-4 sm:px-6 border-b border-white/[0.08] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff]" />
              <h3 className="font-bold text-sm text-white tracking-tight">
                Vista Previa del Fondo
              </h3>
              {item.aspectRatio && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-400/40">
                  {item.aspectRatio}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle: Proporción Real vs Llenar Pantalla */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.08] border border-white/10 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    viewMode === 'original'
                      ? 'bg-cyan-400 text-black font-bold shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Ver imagen completa en su proporción original sin recortar"
                >
                  Proporción Real
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cover')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    viewMode === 'cover'
                      ? 'bg-cyan-400 text-black font-bold shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                  title="Ver cómo llena una pantalla panorámica 16:9"
                >
                  Llenar Pantalla
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Preview with Aura3D UI Overlay Simulation */}
          <div className="relative w-full aspect-video max-h-[58vh] bg-black/90 overflow-hidden flex items-center justify-center p-2">
            {/* Ambient Blurred Background for original ratio mode */}
            {viewMode === 'original' && (
              <img
                src={fullUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
              />
            )}

            {/* The Wallpaper with current live filters applied */}
            <img
              src={fullUrl}
              alt={title}
              className={`select-none pointer-events-none transition-all duration-300 relative z-10 ${
                viewMode === 'original'
                  ? 'max-h-full max-w-full object-contain rounded-lg shadow-2xl'
                  : 'w-full h-full object-cover'
              }`}
              style={{
                filter: `
                  blur(${applicationSettings.blur}px)
                  brightness(${applicationSettings.brightness})
                  saturate(${applicationSettings.saturation})
                `,
                opacity: applicationSettings.opacity,
              }}
            />

            {/* Vignette simulation */}
            {applicationSettings.vignette && (
              <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
            )}

            {/* Simulated Floating UI Overlays to see real contrast */}
            <div className="absolute bottom-4 left-4 z-20 p-2.5 sm:p-3 rounded-2xl bg-black/45 border border-white/20 backdrop-blur-2xl shadow-xl flex items-center gap-3 pointer-events-none select-none">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                3D
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-tight">Aura3D Spatial Engine</p>
                <p className="text-[10px] text-white/60">
                  {viewMode === 'original' ? `Vista nativa [${item.aspectRatio || '16:9'}]` : 'Ajustado a monitor 16:9'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Controls & Actions */}
          <div className="p-4 px-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{title}</h4>
              <p className="text-xs text-white/50 truncate">{description}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors"
                title="Descargar imagen en alta resolución"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApply(item);
                  onClose();
                }}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg cursor-pointer ${
                  isApplied
                    ? 'bg-emerald-400 text-black shadow-[0_0_16px_rgba(52,211,153,0.5)]'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_16px_rgba(0,229,255,0.5)] hover:scale-105 active:scale-95'
                }`}
              >
                {isApplied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Fondo Aplicado</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Aplicar Fondo Global</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
