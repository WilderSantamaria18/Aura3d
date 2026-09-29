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
    { id: 'gallery', label: 'Galería', icon: ImageIcon },
    { id: 'upload', label: 'Subir', icon: Upload },
    { id: 'generate', label: 'IA', icon: Sparkles },
    { id: 'atmosphere', label: 'Atmósfera', icon: CloudFog },
    { id: 'settings', label: 'Ajustes', icon: Sliders },
  ] as const;

  return (
    <>
      <AnimatePresence>
        {/* Card anclado bajo el header: sin velo, para ver el fondo mientras se ajusta */}
        <div className="fixed top-[76px] right-4 z-50 w-[min(440px,calc(100vw-2rem))] max-h-[calc(100dvh-92px)] flex pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: isPeeking ? 0.08 : 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            style={{ transformOrigin: 'top right' }}
            className={`relative w-full rounded-[24px] overflow-hidden liquid-glass liquid-glass-modal flex flex-col select-none shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] ${
              isPeeking ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 py-3 px-4 border-b border-white/[0.08] bg-black/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-cyan-400 to-fuchsia-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="truncate">Estudio de Fondos</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      4K
                    </span>
                  </h2>
                  <p className="text-[10px] text-white/50 truncate">Imagen, IA y atmósferas</p>
                </div>
              </div>

              {/* Action Buttons: Peek Preview & Close */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPeeking(!isPeeking)}
                  className={`glass-btn p-2 ${
                    isPeeking ? 'is-active text-white' : 'text-white/75 hover:text-white'
                  }`}
                  title={isPeeking ? 'Volver a ver el panel' : 'Vista previa rápida (ver fondo sin el panel)'}
                  aria-label="Vista previa transparente"
                >
                  {isPeeking ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="glass-btn p-2 text-white/75 hover:text-white"
                  title="Cerrar panel (Esc o W)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Active Wallpaper Status Bar */}
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
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
                    <span className="text-xs font-semibold text-white truncate max-w-[190px]">
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
                    className="glass-btn is-active flex items-center gap-1 px-3 py-1 text-white text-[10px] font-mono"
                    title="Combinar los colores del sistema con este fondo de pantalla"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Combinar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="glass-btn is-danger flex items-center gap-1 px-3 py-1 text-rose-200 text-[10px] font-mono shrink-0"
                    title="Eliminar fondo actual y regresar al modo original"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Quitar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 pt-3 pb-2 border-b border-white/[0.06]">
              <div className="glass-input !rounded-2xl flex items-center p-1 overflow-x-auto custom-scrollbar">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        isActive ? 'text-white font-bold' : 'text-white/65 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="wallpaper-active-tab"
                          className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/30 to-white/10 border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-4px_rgba(0,0,0,0.5)] z-0"
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
            {/* El scroll lo maneja el card, no cada pestaña */}
            <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
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

            {/* Confirmation Toast Notification */}
            <AnimatePresence>
              {appliedToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-item is-active !rounded-full px-5 py-2.5 text-white font-semibold text-xs flex items-center gap-2 pointer-events-none z-50"
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
