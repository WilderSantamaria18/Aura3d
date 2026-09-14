import React, { useState } from 'react';
import { Cast, FolderOpen, Mic, Square, Play, Pause, Radio } from 'lucide-react';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { RADIO_STATIONS } from '../../config/radioStations';

interface AudioSourceSelectorProps {
  onStartSystemCapture: () => void;
  onLoadAudioFile: (file: File) => void;
  onStartMicrophone: () => void;
  onStop: () => void;
  onTogglePlayPause: () => void;
  isCapturing: boolean;
  isPlaying: boolean;
}

export const AudioSourceSelector: React.FC<AudioSourceSelectorProps> = ({
  onStartSystemCapture,
  onLoadAudioFile,
  onStartMicrophone,
  onStop,
  onTogglePlayPause,
  isCapturing,
  isPlaying,
}) => {
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const { playRadioStation } = useAudioEngine();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadAudioFile(file);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap select-none">
      {/* 1. System audio capture button */}
      <button
        onClick={onStartSystemCapture}
        className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white font-mono text-xs tracking-wider uppercase flex items-center gap-2 transition-all active:scale-95"
      >
        <Cast className="w-3.5 h-3.5 text-emerald-400" />
        <span>Sistema</span>
      </button>

      {/* 2. Load Audio File button */}
      <label className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white font-mono text-xs tracking-wider uppercase flex items-center gap-2 cursor-pointer transition-all active:scale-95">
        <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
        <span>Archivo</span>
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      {/* 3. Live Microphone button */}
      <button
        onClick={onStartMicrophone}
        className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white font-mono text-xs tracking-wider uppercase flex items-center gap-2 transition-all active:scale-95"
      >
        <Mic className="w-3.5 h-3.5 text-amber-400" />
        <span>Micrófono</span>
      </button>

      {/* 4. Spotify Connect button */}
      <button
        onClick={async () => {
          try {
            const res = await fetch('/api/spotify/auth', { method: 'POST' });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
          } catch (err) {
            console.error('Spotify auth trigger failed:', err);
          }
        }}
        className="px-3 py-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] hover:text-white font-mono text-xs tracking-wider uppercase flex items-center gap-2 transition-all active:scale-95"
        title="Conectar con Spotify"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.215.353-.675.466-1.028.25-2.816-1.721-6.36-2.11-10.536-1.157-.403.093-.807-.156-.9-.558-.093-.402.156-.806.558-.9 4.576-1.045 8.492-.6 11.656 1.336.353.216.465.676.25 1.029zm1.467-3.26c-.27.441-.85.578-1.29.308-3.224-1.982-8.139-2.555-11.952-1.398-.496.15-1.026-.134-1.176-.63-.15-.496.134-1.026.63-1.176 4.359-1.323 9.774-.688 13.48 1.589.442.27.579.85.308 1.288zm.135-3.398c-3.864-2.295-10.24-2.508-13.93-1.387-.594.18-1.222-.16-1.402-.754-.18-.594.16-1.222.754-1.402 4.24-1.287 11.28-1.037 15.718 1.597.534.316.708 1.009.392 1.543-.316.534-1.01.708-1.543.392z" />
        </svg>
        <span>Spotify</span>
      </button>

      {/* 5. Radio 24/7 Selector */}
      <div className="relative">
        <button
          onClick={() => setIsRadioOpen(!isRadioOpen)}
          className={`px-3 py-2 rounded-lg border font-mono text-xs tracking-wider uppercase flex items-center gap-2 transition-all active:scale-95 ${
            isRadioOpen
              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white/80 hover:text-white'
          }`}
          title="Radio Web en Vivo 24/7"
        >
          <Radio className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>Radio 24/7</span>
        </button>

        {isRadioOpen && (
          <div className="absolute left-0 bottom-full mb-2 w-52 p-2 rounded-xl bg-[#080b16]/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 flex flex-col gap-1 text-xs font-mono animate-in fade-in zoom-in-95">
            <span className="text-[10px] text-white/40 px-2 pt-1 uppercase tracking-wider font-semibold">
              Estaciones 24/7
            </span>
            <button
              onClick={() => {
                const s = RADIO_STATIONS.find((r) => r.id === 'radio_vaporwaves') || RADIO_STATIONS[2];
                if (s) playRadioStation(s);
                setIsRadioOpen(false);
              }}
              className="flex items-center justify-between p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
                <span>Synthwave 80s</span>
              </div>
              <span className="text-[9px] text-fuchsia-400 font-bold">LIVE</span>
            </button>
            <button
              onClick={() => {
                const s = RADIO_STATIONS.find((r) => r.id === 'radio_groove_salad') || RADIO_STATIONS[0];
                if (s) playRadioStation(s);
                setIsRadioOpen(false);
              }}
              className="flex items-center justify-between p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Lo-Fi Chillout</span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">LIVE</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Play / Pause & Stop Controls */}
      {isCapturing && (
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/[0.08]">
          <button
            onClick={onTogglePlayPause}
            className="px-3 py-2 rounded-lg bg-white text-black font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5 hover:bg-neutral-200 transition-all active:scale-95 shadow-sm"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pausa' : 'Play'}</span>
          </button>

          <button
            onClick={onStop}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-white/60 hover:text-rose-400 border border-white/[0.08] transition-colors active:scale-95"
            title="Detener audio"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioSourceSelector;


