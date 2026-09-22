import React from 'react';
import type { CardConfig } from '../../../store/recorderStore';
import { Waves, Heart } from 'lucide-react';

interface TemplateProps {
  config: CardConfig;
  previewCanvasUrl?: string | null;
}

export const AestheticTemplate: React.FC<TemplateProps> = ({ config, previewCanvasUrl }) => {
  return (
    <div
      className="relative w-full h-full flex flex-col justify-between p-8 select-none overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${config.backgroundColor} 0%, ${config.primaryColor}22 50%, ${config.secondaryColor}33 100%)`,
        color: config.textColor,
        fontFamily: config.fontFamily === 'serif' ? 'Playfair Display, serif' : config.fontFamily === 'mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
      }}
    >
      {/* Dynamic blurred orbs */}
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-50"
        style={{ backgroundColor: config.primaryColor }}
      />
      <div
        className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40"
        style={{ backgroundColor: config.secondaryColor }}
      />

      {/* Top Bar with frosted pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-2">
          <Waves className="w-3.5 h-3.5" style={{ color: config.primaryColor }} />
          <span className="text-xs font-semibold tracking-wider text-white">AURA FLOW</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
          <Heart className="w-4 h-4 text-white/80 fill-white/20" />
        </div>
      </div>

      {/* Middle Card Frame */}
      <div className="relative z-10 my-auto w-full flex flex-col items-center">
        <div className="w-full max-w-[280px] aspect-[4/5] rounded-3xl overflow-hidden p-3 bg-white/10 backdrop-blur-2xl border border-white/25 shadow-2xl flex flex-col">
          <div className="w-full flex-1 rounded-2xl overflow-hidden relative bg-black/40 border border-white/10">
            {previewCanvasUrl ? (
              <img
                src={previewCanvasUrl}
                alt="Visualizer snapshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="w-32 h-32 rounded-full blur-xl animate-pulse"
                  style={{
                    background: `radial-gradient(circle, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)`
                  }}
                />
              </div>
            )}
          </div>

          <div className="pt-4 pb-2 px-2 text-center">
            <h3 className="text-lg font-bold text-white tracking-tight truncate">
              {config.title || 'Euphoria Dream'}
            </h3>
            <p className="text-xs text-white/70 font-medium tracking-wide mt-0.5 truncate">
              {config.artist || 'Aesthetic Mix'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Quote or vibe text */}
      <div className="relative z-10 text-center">
        <p className="text-xs italic text-white/70 tracking-wide font-light">
          "Immersed in infinite spatial frequencies"
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">
          AURA3D • VIBES
        </p>
      </div>
    </div>
  );
};
