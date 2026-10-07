import React, { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  CloudRain,
  Coffee,
  Flame,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  X,
  Zap,
  Disc3,
  Trees,
  Radio,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import {
  soundscapeEngine,
  type SoundscapeType,
  type SoundscapesConfig,
  SOUNDSCAPE_PRESETS,
} from '../../services/soundscapeEngine';
import { triggerVisualShockwave } from './VisualFeedbackRipple';

interface SoundscapesHubProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const SOUNDSCAPE_CHANNELS: Array<{
  type: SoundscapeType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgGlow: string;
}> = [
  {
    type: 'cosmic',
    title: 'Cosmic 432 Hz Drone',
    subtitle: 'Zumbido binaural Theta 4Hz y 108Hz',
    icon: Radio,
    accentColor: 'text-indigo-400',
    bgGlow: 'hover:border-indigo-500/40',
  },
  {
    type: 'vinyl',
    title: 'Vintage Vinyl Crackle',
    subtitle: 'Crujido de aguja 33 RPM y calor analógico',
    icon: Disc3,
    accentColor: 'text-rose-400',
    bgGlow: 'hover:border-rose-500/40',
  },
  {
    type: 'thunder',
    title: 'Thunderstorm & Wind',
    subtitle: 'Truenos lejanos, viento y lluvia fuerte',
    icon: Zap,
    accentColor: 'text-yellow-400',
    bgGlow: 'hover:border-yellow-500/40',
  },
  {
    type: 'forest',
    title: 'Forest Night',
    subtitle: 'Brisa en árboles y grillos nocturnos',
    icon: Trees,
    accentColor: 'text-emerald-400',
    bgGlow: 'hover:border-emerald-500/40',
  },
  {
    type: 'rain',
    title: 'Lluvia en ventana',
    subtitle: 'Ruido rosa 750Hz y gotas suaves',
    icon: CloudRain,
    accentColor: 'text-sky-400',
    bgGlow: 'hover:border-sky-500/40',
  },
  {
    type: 'ocean',
    title: 'Olas del mar',
    subtitle: 'Oleaje sinusoidal 8.5s continuo',
    icon: Waves,
    accentColor: 'text-teal-400',
    bgGlow: 'hover:border-teal-500/40',
  },
  {
    type: 'fire',
    title: 'Fogata',
    subtitle: 'Retumbe 140Hz y chispas Poisson',
    icon: Flame,
    accentColor: 'text-orange-400',
    bgGlow: 'hover:border-orange-500/40',
  },
  {
    type: 'cafe',
    title: 'Cafetería nocturna',
    subtitle: 'Textura acústica formantes 520Hz/1350Hz',
    icon: Coffee,
    accentColor: 'text-amber-400',
    bgGlow: 'hover:border-amber-500/40',
  },
];

export const SoundscapesHub: React.FC<SoundscapesHubProps> = ({ isOpen, onToggle, onClose }) => {
  const panelId = useId();
  const [busyChannel, setBusyChannel] = useState<SoundscapeType | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [soundscapeConfig, setSoundscapeConfig] = useState<SoundscapesConfig>(() =>
    soundscapeEngine.getConfig()
  );

  useEffect(() => soundscapeEngine.subscribe(setSoundscapeConfig), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeSoundscapes = SOUNDSCAPE_CHANNELS.filter(
    ({ type }) => soundscapeConfig[type]?.enabled
  ).length;

  const toggleSoundscape = async (type: SoundscapeType) => {
    if (busyChannel) return;
    setAudioError(null);
    setBusyChannel(type);
    try {
      const didToggle = await soundscapeEngine.toggleChannel(type);
      if (!didToggle)
        setAudioError('No se pudo iniciar el audio. Toca de nuevo o revisa el permiso de reproducción.');
      setActivePreset(null);
    } catch (error) {
      console.warn('[SoundscapesHub] Error al cambiar ambiente.', error);
      setAudioError('El ambiente no pudo activarse. Inténtalo de nuevo.');
    } finally {
      setBusyChannel(null);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    setAudioError(null);
    setActivePreset(presetId);
    triggerVisualShockwave({ color: '#22d3ee' });
    try {
      const ok = await soundscapeEngine.applyPreset(presetId);
      if (!ok) setAudioError('No se pudo aplicar el preset. Revisa el audio.');
    } catch (err) {
      console.warn('[SoundscapesHub] Error aplicando preset:', err);
      setAudioError('Error al activar preset ambiental.');
    }
  };

  const handleStopAll = () => {
    soundscapeEngine.stopAll();
    setActivePreset(null);
    triggerVisualShockwave({ color: '#f43f5e' });
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`flex items-center gap-1.5 glass-btn px-3 py-1 h-8 text-[12px] font-medium transition-all duration-200 cursor-pointer active:scale-95 border ${
            isOpen || activeSoundscapes > 0
              ? 'is-active text-white [--glass-accent:34,211,238]'
              : 'text-white/85 hover:text-white shadow-sm'
          }`}
          title="Soundscapes Hub Pro: 8 ambientes acústicos procedurales en tiempo real"
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          <span className="hidden min-[1500px]:inline text-[12px] font-medium text-white/85">
            Ambientes
          </span>
          {activeSoundscapes > 0 && (
            <span className="min-w-4 h-4 px-1 bg-cyan-300 text-cyan-950 text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {activeSoundscapes}
            </span>
          )}
          <ChevronDown
            className={`w-3 h-3 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <section
            id={panelId}
            role="dialog"
            aria-label="Soundscapes Hub Pro"
            className="fixed inset-x-3 top-14 max-w-[460px] mx-auto sm:mx-0 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2.5 sm:w-[460px] max-h-[min(82vh,740px)] overflow-y-auto liquid-glass-scrollbar liquid-glass liquid-glass--card z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 select-none text-white font-sans p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-white/[0.08]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-300" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    Soundscapes Hub Pro
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      8 Ch
                    </span>
                  </h2>
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-white/50">
                  8 ambientes acústicos procedurales sintetizados en tiempo real con Web Audio.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 -mt-1 -mr-1 rounded-full text-white/55 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Cerrar ambientes"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-white/60 uppercase tracking-wider font-mono">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-cyan-400" /> Presets de Mezcla
                </span>
                {activeSoundscapes > 0 && (
                  <button
                    type="button"
                    onClick={handleStopAll}
                    className="text-rose-300 hover:text-rose-200 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Detener todos los ambientes activos"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Detener todo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {SOUNDSCAPE_PRESETS.map((p) => {
                  const isCurrent = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void handleApplyPreset(p.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.35)] font-semibold'
                          : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08]'
                      }`}
                      title={p.description}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Master Controls & Status */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
              <div className="text-[10px] text-white/50">
                {activeSoundscapes > 0
                  ? `${activeSoundscapes} de 8 canales activos`
                  : 'Ningún canal activo'}
              </div>
              <button
                type="button"
                onClick={() => soundscapeEngine.toggleMasterMute()}
                disabled={activeSoundscapes === 0}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all flex items-center gap-1.5 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
                  soundscapeConfig.masterMuted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:text-white'
                }`}
              >
                {soundscapeConfig.masterMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                {soundscapeConfig.masterMuted ? 'Reactivar' : 'Silenciar todo'}
              </button>
            </div>

            {audioError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-100 flex items-start gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-none mt-0.5" />
                <span>{audioError}</span>
              </div>
            )}

            {/* 8 Procedural Sound Channels List */}
            <div className="flex flex-col gap-2 mt-1" role="tabpanel">
              {SOUNDSCAPE_CHANNELS.map(
                ({ type, title, subtitle, icon: Icon, accentColor, bgGlow }) => {
                  const channel = soundscapeConfig[type] || { volume: 0.4, enabled: false };
                  const isBusy = busyChannel === type;

                  return (
                    <div
                      key={type}
                      className={`glass-item p-2.5 transition-all duration-200 border ${bgGlow} ${
                        channel.enabled
                          ? 'is-active bg-cyan-950/20 border-cyan-400/40 shadow-[0_0_14px_rgba(6,182,212,0.12)]'
                          : 'border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 flex-none rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center transition-transform ${
                              channel.enabled ? 'scale-105' : ''
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${accentColor}`} aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white/95 truncate">
                              {title}
                            </div>
                            <div className="text-[10px] text-white/45 truncate">{subtitle}</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void toggleSoundscape(type)}
                          disabled={Boolean(busyChannel)}
                          aria-pressed={channel.enabled}
                          className={`min-w-14 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono tracking-wide uppercase transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
                            channel.enabled
                              ? 'bg-cyan-300 text-cyan-950 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                              : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/15'
                          }`}
                        >
                          {isBusy ? '...' : channel.enabled ? 'Activo' : 'Activar'}
                        </button>
                      </div>

                      {channel.enabled && (
                        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-white/[0.06] animate-in fade-in duration-150">
                          <Volume2
                            className="w-3.5 h-3.5 text-cyan-300/80 flex-none"
                            aria-hidden="true"
                          />
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.02}
                            value={channel.volume}
                            aria-label={`Volumen de ${title}`}
                            onChange={(event) =>
                              soundscapeEngine.setVolume(
                                type,
                                Number.parseFloat(event.target.value)
                              )
                            }
                            className="flex-1 h-1 bg-white/20 rounded appearance-none accent-cyan-300 cursor-pointer"
                          />
                          <span className="text-[10px] text-cyan-200 w-8 text-right font-mono tabular-nums">
                            {Math.round(channel.volume * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

export default SoundscapesHub;
