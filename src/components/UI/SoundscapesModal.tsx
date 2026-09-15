import React, { useState, useEffect } from 'react';
import { CloudRain, Flame, Coffee, Waves, Volume2, VolumeX, X, Sparkles } from 'lucide-react';
import { soundscapeEngine, type SoundscapeType, type SoundscapesConfig } from '../../services/soundscapeEngine';

interface SoundscapesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChannelMeta {
  type: SoundscapeType;
  title: string;
  subtitle: string;
  emoji: string;
  icon: React.FC<{ className?: string }>;
  sliderColor: string;
}

const CHANNELS: ChannelMeta[] = [
  {
    type: 'rain',
    title: 'Lluvia en Ventana',
    subtitle: 'Ruido rosa 750Hz y gotas suaves',
    emoji: '🌧️',
    icon: CloudRain,
    sliderColor: 'accent-sky-400',
  },
  {
    type: 'fire',
    title: 'Crepitar de Fogata',
    subtitle: 'Retumbe 140Hz y chispas Poisson',
    emoji: '🔥',
    icon: Flame,
    sliderColor: 'accent-orange-500',
  },
  {
    type: 'cafe',
    title: 'Cafetería de Noche',
    subtitle: 'Formantes 520Hz/1350Hz acústicos',
    emoji: '☕',
    icon: Coffee,
    sliderColor: 'accent-amber-400',
  },
  {
    type: 'ocean',
    title: 'Olas del Mar Nocturnas',
    subtitle: 'Oleaje sinusoidal 8.5s continuo',
    emoji: '🌊',
    icon: Waves,
    sliderColor: 'accent-teal-400',
  },
];

export const SoundscapesModal: React.FC<SoundscapesModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SoundscapesConfig>(soundscapeEngine.getConfig());

  useEffect(() => {
    const unsub = soundscapeEngine.subscribe((newCfg) => {
      setConfig(newCfg);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const activeCount = Object.values({
    rain: config.rain.enabled,
    fire: config.fire.enabled,
    cafe: config.cafe.enabled,
    ocean: config.ocean.enabled,
  }).filter(Boolean).length;

  return (
    <>
      {/* Mobile backdrop for tap-away */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] sm:hidden animate-aura-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Proportional Dropdown Popover aligned under trigger */}
      <div
        className="fixed inset-x-3 top-14 max-w-[360px] mx-auto sm:mx-0 sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[340px] max-h-[min(500px,calc(100vh-5rem))] overflow-y-auto p-3 rounded-2xl glass-panel z-50 flex flex-col gap-2.5 animate-aura-popover custom-scrollbar text-white font-display"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col">
              <div className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight font-heading tracking-studio-tight">
                <span>Ambientes Lo-Fi</span>
                {activeCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                    {activeCount} activo{activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/50 tracking-wide mt-0.5">
                Sintetizador Web Audio nativo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => soundscapeEngine.toggleMasterMute()}
              className={`p-1.5 rounded-lg border btn-spring transition-all ${
                config.masterMuted
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                  : 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:text-white'
              }`}
              title={config.masterMuted ? 'Desmutear ambientes' : 'Mutear todos los ambientes'}
            >
              {config.masterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] btn-spring transition-colors"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Channels List */}
        <div className="flex flex-col gap-2">
          {CHANNELS.map((ch) => {
            const state = config[ch.type];
            const Icon = ch.icon;

            return (
              <div
                key={ch.type}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
                  state.enabled
                    ? 'bg-white/[0.05] border-white/20 shadow-sm'
                    : 'bg-white/[0.015] border-white/[0.05] opacity-65 hover:opacity-90'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{ch.emoji}</span>
                    <div className="truncate">
                      <div className="text-[12px] font-bold text-white/95 truncate leading-tight tracking-studio-tight font-heading">
                        {ch.title}
                      </div>
                      <div className="text-[10px] text-white/50 truncate tracking-wide font-sans">{ch.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-1">
                    <span className="text-[10px] text-white/50 font-mono w-7 text-right">
                      {Math.round(state.volume * 100)}%
                    </span>
                    <button
                      onClick={() => soundscapeEngine.toggleChannel(ch.type)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase btn-spring transition-all tracking-wider ${
                        state.enabled
                          ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                          : 'bg-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      {state.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Icon className="w-3 h-3 text-white/40 shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={!state.enabled}
                    value={state.volume}
                    onChange={(e) => soundscapeEngine.setVolume(ch.type, parseFloat(e.target.value))}
                    className={`w-full h-1 rounded-lg bg-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${ch.sliderColor}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[9px] text-white/40">
          <span>Combinable con música</span>
          {activeCount > 0 && (
            <button
              onClick={() => soundscapeEngine.stopAll()}
              className="text-rose-400 hover:text-rose-300 transition-colors underline cursor-pointer"
            >
              Apagar todos
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SoundscapesModal;
