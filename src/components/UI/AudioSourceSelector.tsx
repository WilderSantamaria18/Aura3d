import React from 'react';
import { Cast, FolderOpen, Mic, Square, Play, Pause } from 'lucide-react';

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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadAudioFile(file);
    }
  };

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {/* 1. System audio capture button */}
      <button
        onClick={onStartSystemCapture}
        className="px-4 py-2.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-medium text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,179,0.2)] transition-all hover:scale-105 active:scale-95"
      >
        <Cast className="w-4 h-4" />
        <span>Capturar Sistema</span>
      </button>

      {/* 2. Load Audio File button */}
      <label className="px-4 py-2.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-medium text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.2)] cursor-pointer transition-all hover:scale-105 active:scale-95">
        <FolderOpen className="w-4 h-4" />
        <span>Cargar MP3 / WAV</span>
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
        className="px-4 py-2.5 rounded-full bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/40 text-pink-300 font-medium text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(255,8,138,0.2)] transition-all hover:scale-105 active:scale-95"
      >
        <Mic className="w-4 h-4" />
        <span>Micrófono</span>
      </button>

      {/* 4. Play / Pause & Stop Controls */}
      {isCapturing && (
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/15">
          <button
            onClick={onTogglePlayPause}
            className="px-3.5 py-2.5 rounded-full bg-yellow-400/15 hover:bg-yellow-400/25 border border-yellow-400/40 text-yellow-300 font-medium text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pausa' : 'Play'}</span>
          </button>

          <button
            onClick={onStop}
            className="p-2.5 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 text-red-300 transition-all"
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

