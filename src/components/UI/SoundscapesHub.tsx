import React, { useEffect, useId, useState } from 'react';
import { AlertCircle, ChevronDown, CloudRain, Coffee, Flame, Sparkles, Volume2, VolumeX, Waves, X } from 'lucide-react';
import { soundscapeEngine, type SoundscapeType, type SoundscapesConfig } from '../../services/soundscapeEngine';

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
}> = [
  { type: 'rain', title: 'Lluvia en ventana', subtitle: 'Ruido rosa y gotas suaves', icon: CloudRain, accentColor: 'text-sky-400' },
  { type: 'fire', title: 'Fogata', subtitle: 'Retumbe cálido y chispas', icon: Flame, accentColor: 'text-orange-400' },
  { type: 'cafe', title: 'Cafetería nocturna', subtitle: 'Textura acústica envolvente', icon: Coffee, accentColor: 'text-amber-400' },
  { type: 'ocean', title: 'Olas del mar', subtitle: 'Oleaje lento y continuo', icon: Waves, accentColor: 'text-teal-400' },
];

export const SoundscapesHub: React.FC<SoundscapesHubProps> = ({ isOpen, onToggle, onClose }) => {
  const panelId = useId();
  const [busyChannel, setBusyChannel] = useState<SoundscapeType | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [soundscapeConfig, setSoundscapeConfig] = useState<SoundscapesConfig>(() => soundscapeEngine.getConfig());

  useEffect(() => soundscapeEngine.subscribe(setSoundscapeConfig), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeSoundscapes = SOUNDSCAPE_CHANNELS.filter(({ type }) => soundscapeConfig[type].enabled).length;
  const toggleSoundscape = async (type: SoundscapeType) => {
    if (busyChannel) return;
    setAudioError(null);
    setBusyChannel(type);
    try {
      const didToggle = await soundscapeEngine.toggleChannel(type);
      if (!didToggle) setAudioError('No se pudo iniciar el audio. Toca de nuevo o revisa el permiso de reproducción.');
    } catch (error) {
      console.warn('[SoundscapesHub] Error al cambiar ambiente.', error);
      setAudioError('El ambiente no pudo activarse. Inténtalo de nuevo.');
    } finally {
      setBusyChannel(null);
    }
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
          title="Ambientes de audio"
        >
          <Waves className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          <span className="hidden min-[1500px]:inline text-[12px] font-medium text-white/85">Ambientes</span>
          {activeSoundscapes > 0 && (
            <span className="min-w-4 h-4 px-1 bg-cyan-300 text-cyan-950 text-[9px] font-bold rounded-full flex items-center justify-center">{activeSoundscapes}</span>
          )}
          <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <section
            id={panelId}
            role="dialog"
            aria-label="Ambientes"
            className="fixed inset-x-3 top-14 max-w-[440px] mx-auto sm:mx-0 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2.5 sm:w-[440px] max-h-[min(78vh,720px)] overflow-y-auto liquid-glass-scrollbar liquid-glass liquid-glass--card z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 select-none text-white font-sans"
          >
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-white/[0.08]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-white tracking-tight">Ambientes</h2>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-white/50">Mezcla atmósferas de audio para acompañar tu música.</p>
              </div>
              <button type="button" onClick={onClose} className="w-8 h-8 -mt-1 -mr-1 rounded-full text-white/55 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors" aria-label="Cerrar ambientes">
                <X className="w-4 h-4" />
              </button>
            </div>

            {(
              <div className="flex flex-col gap-2 animate-in fade-in duration-150" role="tabpanel">
                <div className="flex items-center justify-between gap-3 pb-1">
                  <div>
                    <div className="text-[10px] text-white/65 uppercase tracking-wider">Mezclador ambiental</div>
                    <div className="text-[9px] text-white/40">Audio generado y procesado localmente.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => soundscapeEngine.toggleMasterMute()}
                    disabled={activeSoundscapes === 0}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] border transition-all flex items-center gap-1.5 disabled:opacity-35 disabled:cursor-not-allowed ${
                      soundscapeConfig.masterMuted ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {soundscapeConfig.masterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {soundscapeConfig.masterMuted ? 'Reactivar' : 'Silenciar todo'}
                  </button>
                </div>

                {audioError && (
                  <div role="alert" className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-100 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-none mt-0.5" /><span>{audioError}</span>
                  </div>
                )}

                {SOUNDSCAPE_CHANNELS.map(({ type, title, subtitle, icon: Icon, accentColor }) => {
                  const channel = soundscapeConfig[type];
                  const isBusy = busyChannel === type;
                  return (
                    <div key={type} className={`glass-item p-2.5 ${channel.enabled ? 'is-active' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 flex-none rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><Icon className={`w-4 h-4 ${accentColor}`} aria-hidden="true" /></div>
                          <div className="min-w-0"><div className="text-xs font-semibold text-white/90 truncate">{title}</div><div className="text-[9px] text-white/40 truncate">{subtitle}</div></div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleSoundscape(type)}
                          disabled={Boolean(busyChannel)}
                          aria-pressed={channel.enabled}
                          className={`min-w-12 px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all disabled:opacity-50 ${channel.enabled ? 'bg-cyan-300 text-cyan-950' : 'bg-white/10 text-white/60 hover:text-white'}`}
                        >
                          {isBusy ? '...' : channel.enabled ? 'Activo' : 'Activar'}
                        </button>
                      </div>
                      {channel.enabled && (
                        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-white/[0.05]">
                          <Volume2 className="w-3.5 h-3.5 text-cyan-300/80 flex-none" aria-hidden="true" />
                          <input type="range" min={0} max={1} step={0.02} value={channel.volume} aria-label={`Volumen de ${title}`} onChange={(event) => soundscapeEngine.setVolume(type, Number.parseFloat(event.target.value))} className="flex-1 h-1 bg-white/20 rounded appearance-none accent-cyan-300 cursor-pointer" />
                          <span className="text-[9px] text-cyan-200 w-8 text-right font-mono tabular-nums">{Math.round(channel.volume * 100)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

    </>
  );
};

export default SoundscapesHub;
