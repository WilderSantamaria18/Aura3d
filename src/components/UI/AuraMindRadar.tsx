import React from 'react';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { Sparkles, Activity, X, Zap, HeartPulse, Disc, Music2 } from 'lucide-react';

interface AuraMindRadarProps {
  isOpen: boolean;
  onClose: () => void;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const AuraMindRadar: React.FC<AuraMindRadarProps> = ({ isOpen, onClose }) => {
  const { features, palette, mood, dominantPitch, beatPulse } = useAIAudioEngine();
  const { bpm, isBeatPulse, isPlaying, isLucid, lucidTheme } = usePlayerStore();

  if (!isOpen) return null;

  const moodConfig: Record<
    string,
    { label: string; icon: string; desc: string; gradient: string }
  > = {
    energetic: {
      label: 'Energético',
      icon: '⚡',
      desc: 'Alta intensidad rítmica & euforia',
      gradient: 'from-amber-500/20 via-rose-500/20 to-purple-500/20 border-rose-500/40',
    },
    happy: {
      label: 'Alegre / Solar',
      icon: '✨',
      desc: 'Armonías brillantes & tempo optimista',
      gradient: 'from-yellow-500/20 via-amber-500/20 to-orange-500/20 border-amber-500/40',
    },
    chill: {
      label: 'Chill / Celestial',
      icon: '🌿',
      desc: 'Atmósferas relajantes & texturas etéreas',
      gradient: 'from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-emerald-500/40',
    },
    melancholic: {
      label: 'Melancólico / Deep',
      icon: '🌌',
      desc: 'Graves profundos & resonancia introspectiva',
      gradient: 'from-blue-600/20 via-indigo-600/20 to-violet-600/20 border-indigo-500/40',
    },
  };

  const currentMood = moodConfig[mood] || moodConfig.chill;

  // Tempo descriptor
  const getBpmLabel = (val: number) => {
    if (val <= 0) return 'Detectando...';
    if (val < 85) return 'Lento / Balada';
    if (val < 115) return 'Medio / Groove';
    if (val < 132) return 'House / Dance';
    if (val < 155) return 'EDM / Trance';
    return 'D&B / Rápido';
  };

  const activeAccent = isLucid ? lucidTheme.primary : palette.primary || '#00f2fe';

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-50 w-[92vw] max-w-sm sm:max-w-md pointer-events-auto select-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`relative flex flex-col rounded-2xl backdrop-blur-3xl bg-[#070a16]/95 border shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-300 ${currentMood.gradient}`}
        style={{ borderColor: `${activeAccent}50` }}
      >
        {/* Glow ambient background header */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-30 transition-all duration-700"
          style={{ backgroundColor: activeAccent }}
        />

        {/* Header Strip */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full transition-transform duration-100"
              style={{
                backgroundColor: activeAccent,
                boxShadow: `0 0 10px ${activeAccent}`,
                transform: `scale(${1 + beatPulse * 0.5})`,
              }}
            />
            <span className="text-xs font-mono font-bold tracking-widest text-white/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AURA MIND • RADAR IA
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar radar de IA"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="p-4 flex flex-col gap-4 font-mono text-xs">
          {/* 1. Mood Card */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">Estado Emocional</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                <span>{currentMood.icon}</span> {currentMood.label}
              </span>
              <span className="text-[10px] text-white/50 mt-0.5">{currentMood.desc}</span>
            </div>

            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-white/5 border border-white/10 shadow-inner"
              style={{
                transform: `scale(${1 + beatPulse * 0.15})`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              {currentMood.icon}
            </div>
          </div>

          {/* 2. BPM & Live Tempo Pulse */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> TEMPO (BPM)
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full transition-all duration-75"
                  style={{
                    backgroundColor: isBeatPulse ? activeAccent : 'rgba(255,255,255,0.2)',
                    boxShadow: isBeatPulse ? `0 0 8px ${activeAccent}` : 'none',
                    transform: isBeatPulse ? 'scale(1.5)' : 'scale(1)',
                  }}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {isPlaying && bpm > 0 ? bpm : '---'}
                </span>
                <span className="text-[10px] text-white/40">BPM</span>
              </div>
              <span className="text-[10px] text-cyan-300/80 truncate mt-1">
                {getBpmLabel(bpm)}
              </span>
            </div>

            {/* Dominant Pitch / Key */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <Music2 className="w-3 h-3 text-purple-400" /> TONALIDAD
                </span>
                <Disc className="w-3 h-3 text-white/20 animate-spin-slow" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {dominantPitch || '---'}
                </span>
                <span className="text-[10px] text-white/40">Dominante</span>
              </div>
              <span className="text-[10px] text-purple-300/80 truncate mt-1">
                Clave armónica estimada
              </span>
            </div>
          </div>

          {/* 3. Chroma Wheel (12 semitones distribution) */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider">
              <span>Distribución Armónica (Chroma 12 Semitonos)</span>
              <span className="text-cyan-400 font-bold">{dominantPitch}</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
              {PITCH_NAMES.map((pitch, idx) => {
                const chromaEnergy = features.chroma ? features.chroma[idx] || 0 : 0;
                const isDominant = dominantPitch === pitch;
                return (
                  <div key={pitch} className="flex flex-col items-center gap-1">
                    <div className="w-full h-12 bg-white/5 rounded-md overflow-hidden flex items-end p-0.5 border border-white/[0.04]">
                      <div
                        className="w-full rounded-sm transition-all duration-150"
                        style={{
                          height: `${Math.min(100, Math.max(8, chromaEnergy * 100))}%`,
                          backgroundColor: isDominant ? activeAccent : 'rgba(255, 255, 255, 0.3)',
                          boxShadow: isDominant ? `0 0 8px ${activeAccent}` : 'none',
                        }}
                      />
                    </div>
                    <span
                      className={`text-[9px] font-bold ${
                        isDominant ? 'text-cyan-300' : 'text-white/40'
                      }`}
                    >
                      {pitch}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Tri-Band Energy & AI Valence/Arousal */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              Espectro Acústico & Telemetría
            </span>

            {/* Tri-Band energy */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-white/60">
                <span>Graves (Bass)</span>
                <span className="tabular-nums font-bold text-cyan-300">
                  {Math.round(features.bassEnergy * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, features.bassEnergy * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/60 mt-1">
                <span>Medios (Mids)</span>
                <span className="tabular-nums font-bold text-purple-300">
                  {Math.round(features.midEnergy * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, features.midEnergy * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/60 mt-1">
                <span>Agudos (Treble)</span>
                <span className="tabular-nums font-bold text-rose-300">
                  {Math.round(features.trebleEnergy * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, features.trebleEnergy * 100)}%` }}
                />
              </div>
            </div>

            {/* Valence / Arousal meters */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-[10px]">
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.02]">
                <span className="text-white/40">Valence:</span>
                <span className="text-white/80 font-bold">
                  {features.valence > 0 ? `+${(features.valence * 100).toFixed(0)}%` : `${(features.valence * 100).toFixed(0)}%`}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.02]">
                <span className="text-white/40">Arousal:</span>
                <span className="text-white/80 font-bold">
                  {Math.round(features.arousal * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuraMindRadar;
