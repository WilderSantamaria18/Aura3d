import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '../../stores/playerStore';

/**
 * AudioAnnouncer
 * Componente accesible de región en vivo (ARIA Live Region 'polite')
 * que informa de forma no intrusiva a usuarios con lectores de pantalla (NVDA, JAWS, VoiceOver)
 * sobre cambios de estado en tiempo real en Aura3D Studio con soporte multilingüe (ES / EN).
 */
export const AudioAnnouncer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [announcement, setAnnouncement] = useState<string>('');
  const lastTrackId = useRef<string | null>(null);
  const lastIsPlaying = useRef<boolean | null>(null);
  const lastMastering = useRef<string | null>(null);
  const lastVisualizer = useRef<string | null>(null);
  const lastVolume = useRef<number>(1);
  const volumeDebounceTimer = useRef<number | null>(null);

  const {
    currentTrack,
    isPlaying,
    masteringPreset,
    visualizerMode,
    volume,
    isShuffled,
    repeatMode,
  } = usePlayerStore();

  // 1. Anuncio de cambio de pista
  useEffect(() => {
    if (currentTrack && currentTrack.id !== lastTrackId.current) {
      lastTrackId.current = currentTrack.id;
      setAnnouncement(
        t('announcer.nowPlaying', {
          title: currentTrack.title,
          artist: currentTrack.artist || 'Aura3D',
          defaultValue: `Reproduciendo: ${currentTrack.title} de ${currentTrack.artist}`,
        })
      );
    }
  }, [currentTrack, t]);

  // 2. Anuncio de estado de reproducción (Play / Pause)
  useEffect(() => {
    if (lastIsPlaying.current !== null && lastIsPlaying.current !== isPlaying) {
      setAnnouncement(
        isPlaying
          ? t('announcer.nowPlaying', { defaultValue: 'Reproduciendo' })
          : t('announcer.paused', { defaultValue: 'Reproducción pausada' })
      );
    }
    lastIsPlaying.current = isPlaying;
  }, [isPlaying, t]);

  // 3. Anuncio de preset de masterización DSP
  useEffect(() => {
    if (lastMastering.current !== null && lastMastering.current !== masteringPreset) {
      const presetName =
        masteringPreset === 'off'
          ? t('announcer.eqBypassOn', { defaultValue: 'Ecualizador desactivado (bypass)' })
          : t('announcer.eqPreset', {
              preset: masteringPreset.replace('_', ' '),
              defaultValue: `Preset de ecualización cambiado a ${masteringPreset}`,
            });
      setAnnouncement(presetName);
    }
    lastMastering.current = masteringPreset;
  }, [masteringPreset, t]);

  // 4. Anuncio de cambio de visualizador 3D
  useEffect(() => {
    if (lastVisualizer.current !== null && lastVisualizer.current !== visualizerMode) {
      const names: Record<string, string> = {
        sphere: 'Escultura 3D (3D Sphere)',
        blob: 'Rainbow Void Shaders',
        synthwave: 'Synthwave 3D Grid',
        warp: 'Hypersonic Warp Tunnel',
        terrain: 'Cyberpunk 3D Terrain',
      };
      setAnnouncement(
        t('announcer.visualizerMode', {
          mode: names[visualizerMode] || visualizerMode,
          defaultValue: `Modo visualizador cambiado a ${names[visualizerMode] || visualizerMode}`,
        })
      );
    }
    lastVisualizer.current = visualizerMode;
  }, [visualizerMode, t]);

  // 5. Anuncio de volumen debounced (evita spam al deslizar)
  useEffect(() => {
    if (Math.abs(volume - lastVolume.current) >= 0.1) {
      if (volumeDebounceTimer.current) {
        window.clearTimeout(volumeDebounceTimer.current);
      }
      volumeDebounceTimer.current = window.setTimeout(() => {
        const pct = Math.round(volume * 100);
        setAnnouncement(`Volumen ajustado al ${pct}%`);
        lastVolume.current = volume;
      }, 400);
    }
  }, [volume]);

  // 6. Anuncio de modo aleatorio / repetición
  const lastShuffle = useRef(isShuffled);
  useEffect(() => {
    if (lastShuffle.current !== isShuffled) {
      setAnnouncement(isShuffled ? 'Modo aleatorio activado' : 'Modo aleatorio desactivado');
      lastShuffle.current = isShuffled;
    }
  }, [isShuffled]);

  const lastRepeat = useRef(repeatMode);
  useEffect(() => {
    if (lastRepeat.current !== repeatMode) {
      const msg =
        repeatMode === 'all'
          ? 'Repetición de toda la lista activada'
          : repeatMode === 'one'
          ? 'Repetición de una pista activada'
          : 'Repetición desactivada';
      setAnnouncement(msg);
      lastRepeat.current = repeatMode;
    }
  }, [repeatMode]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      id="aura3d-audio-announcer"
    >
      {announcement}
    </div>
  );
};

export default AudioAnnouncer;
