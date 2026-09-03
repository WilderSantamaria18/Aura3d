import React from 'react';
import { Palette, Sparkles, CircleDot, Image as ImageIcon, Trash2, Activity } from 'lucide-react';

interface ControlsProps {
  sphereColor: string;
  onColorChange: (color: string) => void;
  glowIntensity: number;
  onGlowChange: (val: number) => void;
  sphereRadius: number;
  onRadiusChange: (val: number) => void;
  onImageUpload: (file: File) => void;
  imageUrl: string | null;
  onRemoveImage: () => void;
  showBars?: boolean;
  onToggleBars?: () => void;
  barColor?: string;
  onBarColorChange?: (color: string) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  sphereColor,
  onColorChange,
  glowIntensity,
  onGlowChange,
  sphereRadius,
  onRadiusChange,
  onImageUpload,
  imageUrl,
  onRemoveImage,
  showBars = true,
  onToggleBars,
  barColor = '#00E5FF',
  onBarColorChange,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="w-full bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 text-xs text-white/80">
      {/* 1. Sphere Color */}
      <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-2xl border border-white/5">
        <Palette className="w-4 h-4 text-cyan-400" />
        <span className="font-light">Color Esfera</span>
        <input
          type="color"
          value={sphereColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-8 h-6 rounded cursor-pointer bg-transparent border-none"
        />
      </div>

      {/* 2. Glow Intensity */}
      <div className="flex items-center gap-2.5 bg-white/5 px-3.5 py-2 rounded-2xl border border-white/5 flex-1 min-w-[150px]">
        <Sparkles className="w-4 h-4 text-pink-400 flex-shrink-0" />
        <span className="font-light flex-shrink-0">Brillo</span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={glowIntensity}
          onChange={(e) => onGlowChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
        />
        <span className="font-mono text-[11px] text-cyan-300 w-8 text-right">
          {glowIntensity.toFixed(2)}
        </span>
      </div>

      {/* 3. Sphere Radius */}
      <div className="flex items-center gap-2.5 bg-white/5 px-3.5 py-2 rounded-2xl border border-white/5 flex-1 min-w-[150px]">
        <CircleDot className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span className="font-light flex-shrink-0">Radio</span>
        <input
          type="range"
          min="0.6"
          max="2.2"
          step="0.05"
          value={sphereRadius}
          onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
        />
        <span className="font-mono text-[11px] text-cyan-300 w-8 text-right">
          {sphereRadius.toFixed(2)}
        </span>
      </div>

      {/* 4. Bars Toggle & Color */}
      {onToggleBars && (
        <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-2xl border border-white/5">
          <button
            onClick={onToggleBars}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
              showBars
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'text-white/40 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Barras 3D</span>
          </button>

          {onBarColorChange && (
            <input
              type="color"
              value={barColor}
              onChange={(e) => onBarColorChange(e.target.value)}
              className="w-7 h-5 rounded cursor-pointer bg-transparent border-none"
              title="Color de las barras"
            />
          )}
        </div>
      )}

      {/* 5. Custom Texture Image Upload */}
      <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/5">
        <label className="flex items-center gap-1.5 px-2.5 py-1 text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl cursor-pointer transition-all">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{imageUrl ? 'Cambiar Textura' : 'Textura Imagen'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {imageUrl && (
          <button
            onClick={onRemoveImage}
            className="p-1 text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 rounded-lg transition-colors"
            title="Quitar textura"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Controls;

