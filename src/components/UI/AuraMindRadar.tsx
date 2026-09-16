import React from 'react';
import { useAIAudioEngine } from '../../hooks/useAIAudioEngine';
import { usePlayerStore } from '../../stores/playerStore';
import { Sparkles, Activity, X, Zap, Sun, Leaf, Moon, Disc, Music2 } from 'lucide-react';

interface AuraMindRadarProps {
  isOpen: boolean;
  onClose: () => void;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const AuraMindRadar: React.FC<AuraMindRadarProps> = ({ isOpen, onClose }) => {
  const { features, mood, dominantPitch, beatPulse } = useAIAudioEngine();
  const { bpm, isBeatPulse, isPlaying } = usePlayerStore();

  if (!isOpen) return null;

  const moodConfig: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }
  > = {
    energetic: {
      label: 'Energético',
      icon: Zap,
      desc: 'Alta intensidad rítmica & euforia',
    },
    happy: {
      label: 'Alegre / Solar',
      icon: Sun,
      desc: 'Armonías brillantes & tempo optimista',
    },
    chill: {
      label: 'Chill / Celestial',
      icon: Leaf,
      desc: 'Atmósferas relajantes & texturas etéreas',
    },
    melancholic: {
      label: 'Melancólico / Deep',
      icon: Moon,
      desc: 'Graves profundos & resonancia introspectiva',
    },
  };

  const currentMood = moodConfig[mood] || moodConfig.chill;
  const MoodIcon = currentMood.icon;

  // Tempo descriptor
  const getBpmLabel = (val: number) => {
    if (val <= 0) return 'Detectando...';
    if (val < 85) return 'Lento / Balada';
    if (val < 115) return 'Medio / Groove';
    if (val < 132) return 'House / Dance';
    if (val < 155) return 'EDM / Trance';
    return 'D&B / Rápido';
  };

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-50 w-[92vw] max-w-sm sm:max-w-md pointer-events-auto select-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className="relative flex flex-col rounded-modal bg-surface-overlay material-thick border border-border-subtle shadow-[var(--shadow-modal)] overflow-hidden transition-all duration-300"
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-surface-subtle">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-ios-teal transition-transform duration-100"
              style={{
                transform: `scale(${1 + beatPulse * 0.5})`,
              }}
            />
            <span className="text-caption font-mono font-bold tracking-widest text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-ios-teal" /> AURA MIND • RADAR IA
            </span>
          </div>

          <button
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface-subtle transition-colors flex items-center justify-center"
            title="Cerrar radar de IA"
            aria-label="Cerrar radar de IA"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="p-4 flex flex-col gap-4 font-mono text-caption">
          {/* 1. Mood Card */}
          <div className="p-3 rounded-card bg-surface-subtle border border-border-subtle flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-caption text-text-tertiary uppercase tracking-wider">Estado Emocional</span>
              <span className="text-body font-bold text-text-primary flex items-center gap-1.5 mt-0.5">
                <MoodIcon className="w-4 h-4 text-ios-teal" /> {currentMood.label}
              </span>
              <span className="text-caption text-text-secondary mt-0.5">{currentMood.desc}</span>
            </div>

            <div
              className="w-12 h-12 rounded-control flex items-center justify-center text-ios-teal bg-ios-teal/15 border border-ios-teal/30 shadow-inner"
              style={{
                transform: `scale(${1 + beatPulse * 0.15})`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              <MoodIcon className="w-6 h-6" />
            </div>
          </div>

          {/* 2. BPM & Live Tempo Pulse */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-card bg-surface-subtle border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-caption text-text-tertiary">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-ios-teal" /> TEMPO (BPM)
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
                    isBeatPulse ? 'bg-ios-teal scale-150' : 'bg-surface-subtle'
                  }`}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary tabular-nums font-tabular">
                  {isPlaying && bpm > 0 ? bpm : '---'}
                </span>
                <span className="text-caption text-text-tertiary font-tabular">BPM</span>
              </div>
              <span className="text-caption text-ios-teal truncate mt-1">
                {getBpmLabel(bpm)}
              </span>
            </div>

            {/* Dominant Pitch / Key */}
            <div className="p-2.5 rounded-card bg-surface-subtle border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-caption text-text-tertiary">
                <span className="flex items-center gap-1">
                  <Music2 className="w-3 h-3 text-ios-purple" /> TONALIDAD
                </span>
                <Disc className="w-3 h-3 text-text-tertiary animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-text-primary tabular-nums font-tabular">
                  {dominantPitch || '---'}
                </span>
                <span className="text-caption text-text-tertiary">Dominante</span>
              </div>
              <span className="text-caption text-ios-purple truncate mt-1">
                Clave armónica estimada
              </span>
            </div>
          </div>

          {/* 3. Chroma Wheel (12 semitones distribution) */}
          <div className="p-3 rounded-card bg-surface-subtle border border-border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between text-caption text-text-tertiary uppercase tracking-wider">
              <span>Distribución Armónica (Chroma 12 Semitonos)</span>
              <span className="text-ios-teal font-bold">{dominantPitch}</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
              {PITCH_NAMES.map((pitch, idx) => {
                const chromaEnergy = features.chroma ? features.chroma[idx] || 0 : 0;
                const isDominant = dominantPitch === pitch;
                return (
                  <div key={pitch} className="flex flex-col items-center gap-1">
                    <div className="w-full h-12 bg-surface-subtle rounded-control overflow-hidden flex items-end p-0.5 border border-border-subtle">
                      <div
                        className={`w-full rounded-control transition-all duration-150 ${
                          isDominant ? 'bg-ios-teal' : 'bg-surface-active'
                        }`}
                        style={{
                          height: `${Math.min(100, Math.max(8, chromaEnergy * 100))}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-caption font-bold ${
                        isDominant ? 'text-ios-teal' : 'text-text-tertiary'
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
          <div className="p-3 rounded-card bg-surface-subtle border border-border-subtle flex flex-col gap-2.5">
            <span className="text-caption text-text-tertiary uppercase tracking-wider">
              Espectro Acústico & Telemetría
            </span>

            {/* Tri-Band energy */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-caption text-text-secondary">
                <span>Graves (Bass)</span>
                <span className="tabular-nums font-tabular font-bold text-ios-teal">
                  {Math.round(features.bassEnergy * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-subtle rounded-pill overflow-hidden">
                <div
                  className="h-full bg-ios-teal rounded-pill transition-all duration-100"
                  style={{ width: `${Math.min(100, features.bassEnergy * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-caption text-text-secondary mt-1">
                <span>Medios (Mids)</span>
                <span className="tabular-nums font-tabular font-bold text-ios-purple">
                  {Math.round(features.midEnergy * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-subtle rounded-pill overflow-hidden">
                <div
                  className="h-full bg-ios-purple rounded-pill transition-all duration-100"
                  style={{ width: `${Math.min(100, features.midEnergy * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-caption text-text-secondary mt-1">
                <span>Agudos (Treble)</span>
                <span className="tabular-nums font-tabular font-bold text-ios-pink">
                  {Math.round(features.trebleEnergy * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-subtle rounded-pill overflow-hidden">
                <div
                  className="h-full bg-ios-pink rounded-pill transition-all duration-100"
                  style={{ width: `${Math.min(100, features.trebleEnergy * 100)}%` }}
                />
              </div>
            </div>

            {/* Valence / Arousal meters */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle text-caption">
              <div className="flex items-center justify-between px-2 py-1 rounded-control bg-surface-subtle">
                <span className="text-text-tertiary">Valence:</span>
                <span className="text-text-primary font-bold font-tabular">
                  {features.valence > 0 ? `+${(features.valence * 100).toFixed(0)}%` : `${(features.valence * 100).toFixed(0)}%`}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded-control bg-surface-subtle">
                <span className="text-text-tertiary">Arousal:</span>
                <span className="text-text-primary font-bold font-tabular">
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
