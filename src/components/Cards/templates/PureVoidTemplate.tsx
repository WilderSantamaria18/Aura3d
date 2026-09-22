import React from 'react';
import type { CardConfig } from '../../../store/recorderStore';
import { Disc3, Sparkles } from 'lucide-react';

interface TemplateProps {
  config: CardConfig;
  previewCanvasUrl?: string | null;
}

export const PureVoidTemplate: React.FC<TemplateProps> = ({ config, previewCanvasUrl }) => {
  return (
    <div
      className="relative w-full h-full flex flex-col justify-between p-8 select-none overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 40%, ${config.primaryColor}22 0%, ${config.backgroundColor} 75%)`,
        color: config.textColor,
        fontFamily: config.fontFamily === 'serif' ? 'Playfair Display, serif' : config.fontFamily === 'mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
      }}
    >
      {/* Subtle background glow ring */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${config.secondaryColor}33 0%, transparent 60%)`,
        }}
      />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: config.primaryColor }}
          />
          <span className="text-xs tracking-[0.25em] uppercase font-semibold text-white/70">
            Aura3D Soundscape
          </span>
        </div>
        <Sparkles className="w-4 h-4 text-white/50" />
      </div>

      {/* Center Artwork / Visualizer Frame */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <div
          className="relative w-48 h-48 rounded-full flex items-center justify-center p-1 shadow-2xl border border-white/15 backdrop-blur-md"
          style={{
            boxShadow: `0 0 50px ${config.primaryColor}44`,
            backgroundColor: `${config.backgroundColor}88`,
          }}
        >
          {previewCanvasUrl ? (
            <img
              src={previewCanvasUrl}
              alt="Visualizer snapshot"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center bg-black/40">
              <Disc3
                className="w-20 h-20 text-white/30 animate-[spin_12s_linear_infinite]"
                style={{ color: config.primaryColor }}
              />
            </div>
          )}
        </div>

        {/* Title & Artist */}
        <div className="mt-8 text-center px-4 max-w-xs">
          <h2 className="text-2xl font-bold tracking-tight text-white line-clamp-2">
            {config.title || 'Untitled Track'}
          </h2>
          <p className="text-sm font-medium mt-1 text-white/60 tracking-wider uppercase">
            {config.artist || 'Aura3D Artist'}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-mono">
        <span>SPATIAL AUDIO ENGINE</span>
        <span className="tracking-widest">3D AUDIO • VOID</span>
      </div>
    </div>
  );
};
