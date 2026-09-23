import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Trash2, Check, Sparkles, ZoomIn } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useWallpaperStore } from '../../stores/wallpaperStore';

interface WallpaperUploadProps {
  onApplied?: () => void;
}

export const WallpaperUpload: React.FC<WallpaperUploadProps> = ({ onApplied }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const { blobSettings, updateBlobSettings } = usePlayerStore();
  const currentWallpaper = useWallpaperStore((s) => s.currentWallpaper);
  const setCurrentWallpaper = useWallpaperStore((s) => s.setCurrentWallpaper);
  const clearWallpaper = useWallpaperStore((s) => s.clearWallpaper);

  const currentCustomBg = blobSettings?.customBackgroundImage;
  const isCurrentlyActive = Boolean(currentCustomBg && !currentWallpaper?.id.startsWith('preset-'));

  const handleFileProcess = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreviewDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleApplyCustom = (dataUrl: string) => {
    // 1. Guardar en playerStore
    updateBlobSettings({ customBackgroundImage: dataUrl });

    // 2. Establecer en wallpaperStore como resultado personalizado
    setCurrentWallpaper({
      id: `custom-upload-${Date.now()}`,
      url: dataUrl,
      thumbnail: dataUrl,
      prompt: 'Fondo Personalizado Subido',
      style: 'custom',
      aspectRatio: '16:9',
      palette: 'custom',
      seed: 0,
      createdAt: Date.now(),
      source: 'preset',
      isFavorite: false,
      width: 1920,
      height: 1080,
      fileSize: 0,
    });

    onApplied?.();
  };

  const handleRemove = () => {
    setPreviewDataUrl(null);
    clearWallpaper();
  };

  const displayImage = previewDataUrl || currentCustomBg;

  return (
    <div className="flex flex-col gap-4 max-h-[56vh] overflow-y-auto pr-1 custom-scrollbar text-white">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
          }
        }}
      />

      {/* Drag & Drop Upload Zone */}
      {!displayImage ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
            dragOver
              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
              : 'border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-3 text-cyan-400 shadow-[0_0_16px_rgba(0,229,255,0.25)]">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Elige o arrastra una imagen</h4>
          <p className="text-xs text-white/50 text-center max-w-xs mb-3">
            Soporta fotos en alta resolución JPG, PNG o WebP. Se adaptará automáticamente al tamaño de tu pantalla.
          </p>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 transition-colors">
            Explorar en mi PC
          </span>
        </div>
      ) : (
        /* Image Preview & Controls Card */
        <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
            <img
              src={displayImage}
              alt="Vista previa personalizada"
              className="w-full h-full transition-all duration-300"
              style={{
                objectFit: blobSettings?.backgroundFit || 'cover',
                transform: `scale(${blobSettings?.backgroundScale || 1.0})`,
              }}
            />
            {isCurrentlyActive && (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-400 text-black font-mono font-bold text-[10px] shadow-[0_0_12px_rgba(0,229,255,0.8)]">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>FONDO ACTIVO</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-mono text-white/80 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cambiar Imagen</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all active:scale-95"
                title="Quitar imagen subida"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleApplyCustom(displayImage)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all shadow-md active:scale-95 ${
                  isCurrentlyActive
                    ? 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_14px_rgba(0,229,255,0.4)]'
                }`}
              >
                {isCurrentlyActive ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Aplicado</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Aplicar de Fondo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Proportions & Scale adjustments */}
          <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] mt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white/70">Ajuste de Proporción</span>
              <div className="flex rounded-lg bg-black/50 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => updateBlobSettings({ backgroundFit: 'cover' })}
                  className={`px-3 py-1 rounded text-[11px] font-mono transition-all ${
                    (blobSettings?.backgroundFit || 'cover') === 'cover'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Cubrir Pantalla
                </button>
                <button
                  type="button"
                  onClick={() => updateBlobSettings({ backgroundFit: 'contain' })}
                  className={`px-3 py-1 rounded text-[11px] font-mono transition-all ${
                    blobSettings?.backgroundFit === 'contain'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Contener (Sin Corte)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono text-white/60">
                <div className="flex items-center gap-1">
                  <ZoomIn className="w-3 h-3 text-cyan-400" />
                  <span>Zoom / Escala</span>
                </div>
                <span className="text-white font-mono">
                  {((blobSettings?.backgroundScale || 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.75"
                step="0.05"
                value={blobSettings?.backgroundScale || 1.0}
                onChange={(e) => updateBlobSettings({ backgroundScale: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WallpaperUpload;
