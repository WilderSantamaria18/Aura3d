import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Sliders,
  Eye,
  EyeOff,
  Check,
  Ban,
  SlidersHorizontal,
  CloudFog,
  Wand2,
} from 'lucide-react';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { usePlayerStore } from '../../stores/playerStore';
import { WallpaperGallery } from './WallpaperGallery';
import { WallpaperUpload } from './WallpaperUpload';
import { WallpaperGenerator } from './WallpaperGenerator';
import { WallpaperAtmospheres } from './WallpaperAtmospheres';
import { WallpaperSettings } from './WallpaperSettings';
import { WallpaperPreview } from './WallpaperPreview';
import type { WallpaperPreset, WallpaperGenerationResult } from '../../types/wallpaper';
import './wallpapers.css';

export const WallpaperPanel: React.FC = () => {
  const isPanelOpen = useWallpaperStore((s) => s.isPanelOpen);
  const setPanelOpen = useWallpaperStore((s) => s.setPanelOpen);
  const activeTab = useWallpaperStore((s) => s.activeTab);
  const setActiveTab = useWallpaperStore((s) => s.setActiveTab);
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const setCurrentWallpaper = useWallpaperStore((s) => s.setCurrentWallpaper);
  const clearWallpaper = useWallpaperStore((s) => s.clearWallpaper);
  const applicationSettings = useWallpaperStore((s) => s.applicationSettings);
  const updateApplicationSettings = useWallpaperStore((s) => s.updateApplicationSettings);

  const customBg = usePlayerStore((s) => s.blobSettings?.customBackgroundImage);
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidTheme = usePlayerStore((s) => s.lucidTheme);

  const [previewItem, setPreviewItem] = useState<WallpaperPreset | WallpaperGenerationResult | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  if (!isPanelOpen) return null;

  const showToast = (message: string) => {
    setAppliedToast(message);
    setTimeout(() => {
      setAppliedToast(null);
    }, 2800);
  };

  const handleApply = (item: WallpaperPreset | WallpaperGenerationResult) => {
    const fullResult: WallpaperGenerationResult =
      'source' in item
        ? (item as WallpaperGenerationResult)
        : {
            id: item.id,
            url: item.fullUrl,
            thumbnail: item.thumbnailUrl,
            prompt: item.description,
            style: item.style,
            aspectRatio: item.aspectRatio,
            palette: item.palette,
            seed: 0,
            createdAt: Date.now(),
            source: 'preset',
            isFavorite: false,
            width: 1920,
            height: 1080,
            fileSize: 0,
          };

    setCurrentWallpaper(fullResult);
    showToast(`Fondo "${'name' in item ? item.name : 'Personalizado'}" aplicado con éxito`);
  };

  const handleClear = () => {
    clearWallpaper();
    showToast('Fondo restablecido a modo limpio predeterminado');
  };

  const activeTitle = currentWallpaper?.prompt || (customBg ? 'Imagen Personalizada' : null);
  const activeThumb = currentWallpaper?.thumbnail || currentWallpaper?.url || customBg;

  const TABS = [
    { id: 'gallery', label: 'Galería 4K', icon: ImageIcon },
    { id: 'upload', label: 'Subir Foto', icon: Upload },
    { id: 'generate', label: 'Generador IA', icon: Sparkles },
    { id: 'atmosphere', label: 'Atmósfera', icon: CloudFog },
    { id: 'settings', label: 'Ajustes', icon: Sliders },
  ] as const;

  return (
    <>
      <AnimatePresence>
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300 ${
            isPeeking ? 'bg-black/10 pointer-events-none' : 'bg-black/65 backdrop-blur-md pointer-events-auto'
          }`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{
              opacity: isPeeking ? 0.08 : 1,
              scale: isPeeking ? 0.96 : 1,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={`relative w-full max-w-2xl max-h-[90vh] rounded-[28px] overflow-hidden liquid-glass liquid-glass-modal border border-white/20 shadow-2xl flex flex-col select-none ${
              isPeeking ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08] bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.4)]">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Aura Wallpaper & Atmosphere Studio</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      HDR & 4K
                    </span>
                  </h2>
                  <p className="text-[10px] text-white/50">
                    Personaliza el fondo, sube tus imágenes o activa shaders atmosféricos
                  </p>
                </div>
              </div>

              {/* Action Buttons: Peek Preview & Close */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPeeking(!isPeeking)}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    isPeeking
                      ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,229,255,0.8)]'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={isPeeking ? 'Volver a ver el panel' : 'Vista previa rápida (ver fondo sin el panel)'}
                  aria-label="Vista previa transparente"
                >
                  {isPeeking ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Cerrar panel (Esc o W)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Active Wallpaper Status Bar */}
            <div className="px-6 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {activeThumb ? (
                  <div className="w-7 h-7 rounded-lg overflow-hidden border border-cyan-400/40 shrink-0 bg-slate-900 shadow-sm">
                    <img
                      src={activeThumb}
                      alt="Miniatura fondo activo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg border border-white/10 shrink-0 bg-black/60 flex items-center justify-center text-[10px] text-white/40">
                    <Ban className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Estado:</span>
                    <span className="text-xs font-semibold text-white truncate max-w-[220px] sm:max-w-xs">
                      {activeTitle || 'Fondo Limpio Predeterminado'}
                    </span>
                  </div>
                </div>
              </div>

              {activeThumb && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await usePlayerStore.getState().combineWithWallpaper();
                      if (ok) {
                        showToast('¡Colores Lúcidos combinados con el fondo!');
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono transition-all cursor-pointer active:scale-95"
                    title="Combinar los colores del sistema con este fondo de pantalla"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Combinar colores</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[10px] font-mono transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Eliminar fondo actual y regresar al modo original"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Quitar Fondo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-x-auto custom-scrollbar">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isActive ? 'text-black font-bold' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="wallpaper-active-tab"
                          className="absolute inset-0 rounded-xl bg-white shadow-md z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="w-3.5 h-3.5 relative z-10" />
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 flex-1 overflow-hidden">
              {activeTab === 'gallery' && (
                <WallpaperGallery
                  onPreview={(item) => setPreviewItem(item)}
                  onApply={handleApply}
                />
              )}
              {activeTab === 'upload' && (
                <WallpaperUpload onApplied={() => showToast('Foto personal aplicada como fondo')} />
              )}
              {activeTab === 'generate' && (
                <WallpaperGenerator
                  onPreview={(item) => setPreviewItem(item)}
                  onApply={handleApply}
                />
              )}
              {activeTab === 'atmosphere' && <WallpaperAtmospheres />}
              {activeTab === 'settings' && <WallpaperSettings />}
            </div>

            {/* Quick Adjustments Footer Bar: Opacity & Blur always visible */}
            <div className="px-6 py-3 border-t border-white/[0.08] bg-black/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                {/* Opacity */}
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-mono text-white/50 whitespace-nowrap">Opacidad:</span>
                  <input
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={applicationSettings.opacity}
                    onChange={(e) => updateApplicationSettings({ opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono text-cyan-300 w-8 text-right tabular-nums">
                    {Math.round(applicationSettings.opacity * 100)}%
                  </span>
                </div>

                {/* Blur */}
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-mono text-white/50 whitespace-nowrap">Desenfoque:</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={applicationSettings.blur}
                    onChange={(e) => updateApplicationSettings({ blur: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono text-cyan-300 w-8 text-right tabular-nums">
                    {applicationSettings.blur}px
                  </span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-white/30 hidden sm:block">
                ATAJO: [W]
              </div>
            </div>

            {/* Confirmation Toast Notification */}
            <AnimatePresence>
              {appliedToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-cyan-500/90 text-black font-semibold text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md pointer-events-none z-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{appliedToast}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Preview Modal */}
      {previewItem && (
        <WallpaperPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onApply={handleApply}
        />
      )}
    </>
  );
};

export default WallpaperPanel;
