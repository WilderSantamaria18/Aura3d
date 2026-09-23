import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Image as ImageIcon, History, Sliders, Layers } from 'lucide-react';
import { useWallpaperStore } from '../../stores/wallpaperStore';
import { WallpaperGallery } from './WallpaperGallery';
import { WallpaperGenerator } from './WallpaperGenerator';
import { WallpaperHistory } from './WallpaperHistory';
import { WallpaperSettings } from './WallpaperSettings';
import { WallpaperPreview } from './WallpaperPreview';
import type { WallpaperPreset, WallpaperGenerationResult } from '../../types/wallpaper';
import './wallpapers.css';

export const WallpaperPanel: React.FC = () => {
  const isPanelOpen = useWallpaperStore((s) => s.isPanelOpen);
  const setPanelOpen = useWallpaperStore((s) => s.setPanelOpen);
  const activeTab = useWallpaperStore((s) => s.activeTab);
  const setActiveTab = useWallpaperStore((s) => s.setActiveTab);
  const setCurrentWallpaper = useWallpaperStore((s) => s.setCurrentWallpaper);

  const [previewItem, setPreviewItem] = useState<WallpaperPreset | WallpaperGenerationResult | null>(null);

  if (!isPanelOpen) return null;

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
  };

  const TABS = [
    { id: 'gallery', label: 'Galería', icon: ImageIcon },
    { id: 'generate', label: 'Generar IA', icon: Sparkles },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'settings', label: 'Ajustes', icon: Sliders },
  ] as const;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-xl max-h-[88vh] rounded-[28px] overflow-hidden liquid-glass liquid-glass-modal border border-white/20 shadow-2xl flex flex-col select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_12px_rgba(0,229,255,0.4)]">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>Aura Wallpapers AI</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                      4K MINIMAL
                    </span>
                  </h2>
                  <p className="text-[10px] text-white/50">Fondos cinemáticos y etéreos en tiempo real</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar panel (Esc o W)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Control Tabs */}
            <div className="px-6 pt-3 pb-2 border-b border-white/[0.06]">
              <div className="flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive ? 'text-black font-bold' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="wallpaper-active-tab"
                          className="absolute inset-0 rounded-full bg-white shadow-md z-0"
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
              {activeTab === 'generate' && (
                <WallpaperGenerator
                  onPreview={(item) => setPreviewItem(item)}
                  onApply={handleApply}
                />
              )}
              {activeTab === 'history' && (
                <WallpaperHistory
                  onPreview={(item) => setPreviewItem(item)}
                  onApply={handleApply}
                />
              )}
              {activeTab === 'settings' && <WallpaperSettings />}
            </div>

            {/* Footer Telemetry */}
            <div className="px-6 py-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>ESTÉTICA APPLE LIQUID GLASS</span>
              <span>ATAJO: [W] PARA ABRIR</span>
            </div>
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
