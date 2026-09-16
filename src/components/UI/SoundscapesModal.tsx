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
  icon: React.FC<{ className?: string }>;
}

const CHANNELS: ChannelMeta[] = [
  {
    type: 'rain',
    title: 'Lluvia en Ventana',
    subtitle: 'Ruido rosa 750Hz y gotas suaves',
    icon: CloudRain,
  },
  {
    type: 'fire',
    title: 'Crepitar de Fogata',
    subtitle: 'Retumbe 140Hz y chispas Poisson',
    icon: Flame,
  },
  {
    type: 'cafe',
    title: 'Cafetería de Noche',
    subtitle: 'Formantes 520Hz/1350Hz acústicos',
    icon: Coffee,
  },
  {
    type: 'ocean',
    title: 'Olas del Mar Nocturnas',
    subtitle: 'Oleaje sinusoidal 8.5s continuo',
    icon: Waves,
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
        className="fixed inset-0 z-40 bg-surface-backdrop material-thick sm:hidden animate-aura-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Proportional Dropdown Popover aligned under trigger */}
      <div
        className="fixed inset-x-3 top-14 max-w-[360px] mx-auto sm:mx-0 sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] max-h-[min(500px,calc(100vh-5rem))] overflow-y-auto p-3.5 rounded-modal bg-surface-overlay material-thick border border-border-subtle shadow-popover z-50 flex flex-col gap-2.5 animate-aura-popover custom-scrollbar text-text-primary font-display"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-control bg-accent-teal/15 border border-accent-teal/30 text-accent-teal">
              <Sparkles className="w-4 h-4" />
            </span>
            <div className="flex flex-col">
              <div className="text-body font-bold text-text-primary flex items-center gap-1.5 leading-tight font-heading tracking-tight">
                <span>Ambientes Lo-Fi</span>
                {activeCount > 0 && (
                  <span className="text-caption px-2 py-0.5 rounded-pill bg-accent-teal/20 text-accent-teal font-bold font-tabular">
                    {activeCount} activo{activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-caption text-text-tertiary tracking-wide mt-0.5">
                Sintetizador Web Audio nativo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => soundscapeEngine.toggleMasterMute()}
              aria-label={config.masterMuted ? 'Desmutear ambientes' : 'Mutear todos los ambientes'}
              className={`min-h-11 min-w-11 p-2 rounded-control border btn-spring transition-all flex items-center justify-center cursor-pointer ${
                config.masterMuted
                  ? 'bg-status-error/20 text-status-error border-status-error/40 shadow-subtle'
                  : 'bg-surface-base/60 text-text-secondary border-border-subtle hover:text-text-primary hover:bg-white/10'
              }`}
              title={config.masterMuted ? 'Desmutear ambientes' : 'Mutear todos los ambientes'}
            >
              {config.masterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar modal de ambientes"
              className="min-h-11 min-w-11 p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-white/10 btn-spring transition-colors flex items-center justify-center cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
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
                className={`p-2.5 sm:p-3 rounded-card border transition-all ${
                  state.enabled
                    ? 'bg-surface-base/90 border-accent-teal/30 shadow-subtle'
                    : 'bg-surface-base/40 border-border-subtle opacity-70 hover:opacity-90'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-control bg-surface-base border border-border-subtle flex items-center justify-center text-accent-teal shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-body font-bold text-text-primary truncate leading-tight tracking-tight font-heading">
                        {ch.title}
                      </div>
                      <div className="text-caption text-text-tertiary truncate tracking-wide font-sans">{ch.subtitle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-1">
                    <span className="text-caption text-accent-teal font-mono font-tabular w-9 text-right">
                      {Math.round(state.volume * 100)}%
                    </span>
                    <button
                      onClick={() => soundscapeEngine.toggleChannel(ch.type)}
                      aria-label={`Alternar canal ${ch.title}`}
                      className={`min-h-11 px-3 py-1 rounded-control text-caption font-bold uppercase btn-spring transition-all tracking-wider cursor-pointer ${
                        state.enabled
                          ? 'bg-accent-teal text-black shadow-subtle'
                          : 'bg-white/10 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {state.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <div className="flex items-center gap-2 pt-1">
                  <Icon className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    disabled={!state.enabled}
                    value={state.volume}
                    aria-label={`Volumen de ${ch.title}`}
                    onChange={(e) => soundscapeEngine.setVolume(ch.type, parseFloat(e.target.value))}
                    className="w-full min-h-11 bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed accent-accent-teal"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-caption text-text-tertiary">
          <span>Combinable con música</span>
          {activeCount > 0 && (
            <button
              onClick={() => soundscapeEngine.stopAll()}
              className="text-status-error hover:underline transition-colors cursor-pointer min-h-11 flex items-center"
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
