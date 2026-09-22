import React from 'react';
import type { CardConfig } from '../../../store/recorderStore';
import { Disc } from 'lucide-react';

interface TemplateProps {
  config: CardConfig;
  previewCanvasUrl?: string | null;
}

export const VinylTemplate: React.FC<TemplateProps> = ({ config, previewCanvasUrl }) => {
  return (
    <div
      className="relative w-full h-full flex flex-col justify-between p-8 select-none overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${config.backgroundColor} 0%, #030303 100%)`,
        color: config.textColor,
        fontFamily: config.fontFamily === 'serif' ? 'Playfair Display, serif' : config.fontFamily === 'mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
      }}
    >
      {/* Vinyl record grooved background simulation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <div className="w-[420px] h-[420px] rounded-full border border-white/20 flex items-center justify-center">
          <div className="w-[340px] h-[340px] rounded-full border border-white/20 flex items-center justify-center">
            <div className="w-[260px] h-[260px] rounded-full border border-white/20 flex items-center justify-center">
              <div className="w-[180px] h-[180px] rounded-full border border-white/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.3em] font-serif text-white/70">
          Side A • 33 ⅓ RPM
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] font-mono text-white/50">
          STEREO HI-FI
        </div>
      </div>

      {/* Center Vinyl Centerpiece */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-full bg-gradient-to-tr from-zinc-900 via-zinc-800 to-zinc-950 p-2 shadow-2xl border-4 border-zinc-700/50 flex items-center justify-center animate-[spin_20s_linear_infinite]">
          {/* Tone grooves */}
          <div className="absolute inset-2 rounded-full border border-white/5" />
          <div className="absolute inset-6 rounded-full border border-white/5" />
          <div className="absolute inset-10 rounded-full border border-white/5" />

          {/* Center Label */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/30 flex items-center justify-center relative shadow-inner"
            style={{ backgroundColor: config.primaryColor }}
          >
            {previewCanvasUrl ? (
              <img
                src={previewCanvasUrl}
                alt="Album label"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-black">
                <Disc className="w-6 h-6 text-black/70 mb-0.5" />
                <span className="text-[8px] font-bold tracking-tight uppercase">AURA</span>
              </div>
            )}
            {/* Center Spindle hole */}
            <div className="absolute w-3 h-3 rounded-full bg-zinc-950 border border-white/40" />
          </div>
        </div>

        {/* Title & Artist */}
        <div className="mt-8 text-center px-4 max-w-xs">
          <h2 className="text-2xl font-serif font-bold tracking-normal text-white line-clamp-2">
            {config.title || 'Analog Resonance'}
          </h2>
          <p className="text-xs font-serif italic text-white/60 tracking-wider mt-1">
            {config.artist || 'Classic Vinyl Editions'}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 text-center border-t border-white/10 pt-3">
        <span className="text-[10px] tracking-[0.25em] uppercase font-serif text-white/40">
          Aura3D High Fidelity Sound Reproduction
        </span>
      </div>
    </div>
  );
};
