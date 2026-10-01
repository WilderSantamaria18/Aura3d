/**
 * Entradas en vivo (micrófono y audio del sistema / pestaña).
 *
 * Única implementación: useAudioPlayer, useMicrophone y useSystemAudio delegan aquí,
 * así un arreglo se aplica en todas las pantallas a la vez.
 */
import { audioEngine } from './audioEngine';
import { usePlayerStore } from '../stores/playerStore';
import type { Track } from '../types/audio';

export type LiveInputResult =
  | { ok: true }
  /** El usuario canceló o cerró el diálogo: no es un error que mostrar */
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

const isCancel = (err: unknown) =>
  err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError');

/** Extrae título y artista de la etiqueta de la pestaña / ventana capturada */
export function parseStreamLabel(rawLabel?: string): { title: string; artist: string } {
  if (!rawLabel) return { title: 'Pestaña del Navegador', artist: 'Captura en Vivo' };

  const clean = rawLabel
    .replace(/^screen:\d+:\d+/i, '')
    .replace(/^window:\d+:\d+/i, '')
    .replace(/\s*-\s*YouTube\s*/gi, '')
    .replace(/\s*-\s*Spotify\s*/gi, '')
    .replace(/\s*-\s*SoundCloud\s*/gi, '')
    .replace(/YouTube\s*-\s*/gi, '')
    .replace(/Spotify\s*-\s*/gi, '')
    .replace(/\(Official (Music )?Video\)/gi, '')
    .replace(/\(Official Audio\)/gi, '')
    .replace(/\[Official (Music )?Video\]/gi, '')
    .replace(/\[Official Audio\]/gi, '')
    .trim();

  if (!clean || clean.length < 2) {
    return { title: 'Pestaña de Audio', artist: 'Captura en Vivo' };
  }

  const parts = clean.split(/\s+[-–—|:]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const title = parts.slice(1).join(' - ').trim();
    return { title: title || clean, artist: artist || 'Captura en Vivo' };
  }

  return { title: clean, artist: 'Pestaña en Vivo' };
}

function markPlaying(track: Track, resetTime: boolean) {
  const s = usePlayerStore.getState();
  s.setCurrentTrack(track);
  if (resetTime) {
    s.setCurrentTime(0);
    s.setDuration(0);
  }
  s.setHasStarted(true);
  s.setAudioUnlocked(true);
  s.setIsPlaying(true);
}

/** Obtiene el stream de audio del sistema: loopback nativo de Electron o getDisplayMedia */
async function acquireSystemStream(): Promise<MediaStream> {
  const electronAPI = (window as unknown as {
    electron?: { getDesktopSourceStream?: () => Promise<MediaStream> };
  }).electron;
  if (electronAPI && typeof electronAPI.getDesktopSourceStream === 'function') {
    try {
      return await electronAPI.getDesktopSourceStream();
    } catch (e) {
      console.warn('[liveInputs] Loopback de Electron no disponible, usando getDisplayMedia:', e);
    }
  }

  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
  } catch (err) {
    if (isCancel(err)) throw err; // no reintentar si el usuario canceló el diálogo
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  }
}

export async function startSystemCapture(): Promise<LiveInputResult> {
  try {
    const stream = await acquireSystemStream();
    stream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });

    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      return {
        ok: false,
        cancelled: false,
        error: 'No se capturó audio. Asegúrate de marcar "Compartir audio del sistema" en el diálogo.',
      };
    }

    // La etiqueta hay que leerla antes: enableSystemCapture detiene las pistas de video
    const rawLabel = stream.getVideoTracks()[0]?.label || stream.getAudioTracks()[0]?.label || '';
    const audioTrack = stream.getAudioTracks()[0];

    await audioEngine.enableSystemCapture(stream);

    const { title, artist } = parseStreamLabel(rawLabel);
    markPlaying(
      { id: 'sys_' + Date.now(), title, artist, duration: 0, sourceType: 'system' as never, addedAt: Date.now() },
      true
    );

    // El usuario deja de compartir desde el navegador
    audioTrack.onended = () => {
      if (!audioEngine.isSystemCaptureActive()) return; // ya se cambió de fuente
      audioEngine.disableSystemCapture();
      usePlayerStore.getState().setIsPlaying(false);
    };
    return { ok: true };
  } catch (err) {
    if (isCancel(err)) return { ok: false, cancelled: true };
    console.warn('[liveInputs] system capture error:', err);
    return {
      ok: false,
      cancelled: false,
      error: err instanceof Error ? err.message : 'Error al capturar audio del sistema',
    };
  }
}

export function stopSystemCapture(): void {
  audioEngine.disableSystemCapture();
  usePlayerStore.getState().setIsPlaying(false);
}

export async function startMicrophone(): Promise<LiveInputResult> {
  try {
    await audioEngine.enableMicrophone();
    usePlayerStore.getState().setIsMicActive(true);
    markPlaying(
      {
        id: 'mic_' + Date.now(),
        title: 'Micrófono en vivo',
        artist: 'Entrada exterior',
        duration: 0,
        sourceType: 'mic',
        addedAt: Date.now(),
      },
      false
    );
    return { ok: true };
  } catch (err) {
    if (isCancel(err)) return { ok: false, cancelled: true };
    console.warn('[liveInputs] mic error:', err);
    return {
      ok: false,
      cancelled: false,
      error: err instanceof Error ? err.message : 'Error al acceder al micrófono',
    };
  }
}

export function stopMicrophone(): void {
  audioEngine.disableMicrophone();
  const s = usePlayerStore.getState();
  s.setIsMicActive(false);
  s.setIsPlaying(false);
}
