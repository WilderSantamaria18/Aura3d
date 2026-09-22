import React from 'react';
import type { CardConfig } from '../../../store/recorderStore';
import { Activity, Sliders, Volume2 } from 'lucide-react';

interface TemplateProps {
  config: CardConfig;
  previewCanvasUrl?: string | null;
}

export const StudioTemplate: React.FC<TemplateProps> = ({ config, previewCanvasUrl }) => {
  return (
    <div
      className="relative w-full h-full flex flex-col justify-between p-7 select-none overflow-hidden"
      style={{
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        fontFamily: config.fontFamily === 'serif' ? 'Playfair Display, serif' : config.fontFamily === 'mono' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'
      }}
    >
      {/* Precision Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(${config.textColor} 1px, transparent 1px), linear-gradient(90deg, ${config.textColor} 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/20 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: config.primaryColor }} />
          <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-white/90">
            AURA MASTER [48KHZ / 24BIT]
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono border border-white/15">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>LIVE DSP</span>
        </div>
      </div>

      {/* Main Center Section */}
      <div className="relative z-10 my-auto w-full flex flex-col gap-4">
        {/* Technical display window */}
        <div className="w-full aspect-[16/10] rounded-lg overflow-hidden border border-white/20 bg-black/60 relative p-1">
          {previewCanvasUrl ? (
            <img
              src={previewCanvasUrl}
              alt="Visualizer snapshot"
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full rounded flex items-center justify-center bg-zinc-950">
              <Sliders className="w-10 h-10 text-white/30" />
            </div>
          )}

          {/* Corner crosshairs */}
          <div className="absolute top-2 left-2 text-[9px] font-mono text-white/40">CH 1/2</div>
          <div className="absolute top-2 right-2 text-[9px] font-mono text-white/40">0 dBFS</div>
        </div>

        {/* Audio Meter Bar Simulation */}
        <div className="flex gap-1 h-3 w-full opacity-80">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-xs"
              style={{
                backgroundColor:
                  i > 20 ? '#ef4444' : i > 15 ? '#f59e0b' : config.primaryColor,
                opacity: (i % 3 === 0 ? 0.9 : 0.4)
              }}
            />
          ))}
        </div>

        {/* Track details in technical style */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">TRACK IDENTIFIER</div>
          <h3 className="text-xl font-bold font-mono text-white tracking-tight mt-0.5 truncate">
            {config.title || 'AUDIO_SESSION_01'}
          </h3>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-xs font-mono text-white/70">
            <span>ARTIST: {config.artist || 'AURA_ENGINE'}</span>
            <span>BPM: 128</span>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-white/50 border-t border-white/20 pt-3">
        <div className="flex items-center gap-1">
          <Volume2 className="w-3 h-3" />
          <span>SPATIAL CONVOLUTION</span>
        </div>
        <span>WASAPI LOOPBACK</span>
      </div>
    </div>
  );
};
