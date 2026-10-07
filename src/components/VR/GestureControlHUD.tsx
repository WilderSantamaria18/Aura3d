import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hand, Camera, CameraOff, ShieldCheck, ChevronsLeftRight, Volume2, Pause, X } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioPlayerActions } from '../../hooks/useAudioPlayer';
import { useSpotifyPlayer } from '../../hooks/useSpotifyPlayer';
import { isSpotifyActiveSource } from '../../utils/spotifyRouting';
import { SpatialVisionService, type HandTrackingResult } from '../../services/spatialVisionService';
import {
  PlayerGestureDetector,
  type HandPose,
  type PlayerGestureAction,
} from '../../features/gestures/playerGestures';

type Status = 'off' | 'starting' | 'on';

const RING_LENGTH = 2 * Math.PI * 16;
const TOAST_MS = 1400;

function cameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') return 'Permiso de cámara denegado. Actívalo en el navegador para usar gestos.';
    if (err.name === 'NotFoundError') return 'No se encontró ninguna cámara.';
    if (err.name === 'NotReadableError') return 'La cámara está en uso por otra aplicación.';
  }
  return 'No se pudo iniciar la cámara.';
}

/** La palma usa el punto medio entre la muñeca y la base del dedo corazón (estable al abrir/cerrar los dedos). */
function palmCenter(hand: HandTrackingResult): { x: number; y: number } {
  const wrist = hand.landmarks[0];
  const mcp = hand.landmarks[9];
  return { x: 1 - (wrist.x + mcp.x) / 2, y: (wrist.y + mcp.y) / 2 };
}

const LEGEND = [
  { icon: <ChevronsLeftRight className="w-3.5 h-3.5" />, gesture: 'Desliza la mano abierta', action: 'Pista anterior / siguiente' },
  { icon: <Volume2 className="w-3.5 h-3.5" />, gesture: 'Pellizca y sube o baja', action: 'Volumen' },
  { icon: <Pause className="w-3.5 h-3.5" />, gesture: 'Palma quieta 1 s', action: 'Reproducir / pausa' },
] as const;

/**
 * Control gestual del reproductor por cámara. Reutiliza la cámara y el modelo de manos de
 * SpatialVisionService (no abre una segunda cámara) y procesa todo en el dispositivo.
 * La posición del cursor y el anillo de la palma se escriben directo en el DOM, sin estado React por frame.
 */
export const GestureControlHUD: React.FC = () => {
  const isLucid = usePlayerStore((s) => s.isLucid);
  const lucidPrimary = usePlayerStore((s) => s.lucidTheme?.primary || '#00f0ff');
  const isUiIdle = usePlayerStore((s) => s.isUiIdle);
  const accent = isLucid ? lucidPrimary : '#00f0ff';

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('off');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  const isSpotifyConnected = usePlayerStore((s) => s.isSpotifyConnected);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const spotifyActive = isSpotifyActiveSource({ isSpotifyConnected, currentTrack });
  const engine = useAudioPlayerActions();
  const spotify = useSpotifyPlayer();

  // Acciones en un ref: el listener de la cámara vive fuera del ciclo de render
  const actionsRef = useRef({ engine, spotify, spotifyActive });
  useEffect(() => {
    actionsRef.current = { engine, spotify, spotifyActive };
  });

  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const detectorRef = useRef(new PlayerGestureDetector());
  const startedRef = useRef(false);
  const toastTimerRef = useRef<number>(0);
  const lastVolumeToastRef = useRef(0);

  const showToast = useCallback((text: string) => {
    setToast({ id: performance.now(), text });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const perform = useCallback(
    (action: PlayerGestureAction) => {
      const { engine: eng, spotify: spot, spotifyActive: viaSpotify } = actionsRef.current;
      switch (action.type) {
        case 'next':
          void (viaSpotify ? spot.playNext() : eng.playNext());
          showToast('Siguiente pista');
          break;
        case 'previous':
          void (viaSpotify ? spot.playPrevious() : eng.playPrevious());
          showToast('Pista anterior');
          break;
        case 'toggle': {
          // El estado se lee antes de alternar: el store se actualiza de forma síncrona al llamar a toggle
          const wasPlaying = usePlayerStore.getState().isPlaying;
          if (viaSpotify) spot.togglePlayPause();
          else eng.togglePlayPause();
          showToast(wasPlaying ? 'Pausa' : 'Reproducir');
          break;
        }
        case 'volume': {
          const next = Math.max(0, Math.min(1, usePlayerStore.getState().volume + action.delta));
          eng.setVolume(next);
          const now = performance.now();
          if (now - lastVolumeToastRef.current > 120) {
            lastVolumeToastRef.current = now;
            showToast(`Volumen ${Math.round(next * 100)}%`);
          }
          break;
        }
      }
    },
    [showToast]
  );

  const stop = useCallback(() => {
    window.clearTimeout(toastTimerRef.current);
    detectorRef.current.reset();
    setStatus('off');
    setToast(null);
    if (startedRef.current) {
      startedRef.current = false;
      // Si el estudio de cámara está abierto comparte la cámara: no se la quitamos
      if (!usePlayerStore.getState().isCameraStudioOpen) SpatialVisionService.getInstance().stopCamera();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus('starting');
    try {
      await SpatialVisionService.getInstance().startCamera();
      startedRef.current = true;
      setStatus('on');
    } catch (err) {
      setError(cameraErrorMessage(err));
      setStatus('off');
    }
  }, []);

  // Suscripción a las manos mientras la cámara está encendida
  useEffect(() => {
    if (status !== 'on') return;
    const detector = detectorRef.current;
    const unsubscribe = SpatialVisionService.getInstance().subscribeHands((hands) => {
      const cursor = cursorRef.current;
      const ring = ringRef.current;
      const hand = hands[0];
      if (!hand || hand.landmarks.length < 21) {
        if (cursor) cursor.style.opacity = '0';
        if (ring) ring.style.strokeDashoffset = String(RING_LENGTH);
        detector.update(null, performance.now());
        return;
      }
      const tip = hand.landmarks[8];
      if (cursor) {
        cursor.style.opacity = '1';
        cursor.style.transform = `translate3d(${(1 - tip.x) * window.innerWidth}px, ${tip.y * window.innerHeight}px, 0)`;
      }
      const palm = palmCenter(hand);
      const pose: HandPose = hand.gesture;
      const frame = detector.update({ x: palm.x, y: palm.y, pose }, performance.now());
      if (ring) ring.style.strokeDashoffset = String(RING_LENGTH * (1 - frame.palmProgress));
      if (frame.action) perform(frame.action);
    });
    return unsubscribe;
  }, [status, perform]);

  // Apagar la cámara al desmontar
  useEffect(() => stop, [stop]);

  const active = status === 'on';
  const panelHidden = isUiIdle && !open && active;

  return (
    <>
      {/* Cursor holográfico que sigue la punta del índice */}
      {active && (
        <div
          ref={cursorRef}
          aria-hidden="true"
          className="fixed top-0 left-0 z-[60] pointer-events-none"
          style={{ opacity: 0, transition: 'opacity 200ms', willChange: 'transform' }}
        >
          <div className="relative -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center">
            <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
              <circle
                ref={ringRef}
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke={accent}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH}
              />
            </svg>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 14px ${accent}, 0 0 32px ${accent}80` }}
            />
          </div>
        </div>
      )}

      {/* Aviso de la acción ejecutada */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            role="status"
            className="fixed left-1/2 -translate-x-1/2 top-24 z-[60] px-4 py-2 rounded-full text-sm font-medium text-white backdrop-blur-xl bg-black/45 border border-white/15 pointer-events-none"
            style={{ boxShadow: `0 0 24px ${accent}55` }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel y botón de control */}
      <div
        className={`fixed left-4 bottom-[7.5rem] z-[55] flex flex-col items-start gap-2 transition-opacity duration-500 ${
          panelHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-[min(320px,calc(100vw-2rem))] p-4 rounded-3xl text-white backdrop-blur-2xl bg-black/50 border border-white/15 border-t-white/30"
              style={{ boxShadow: `0 18px 48px -12px rgba(0,0,0,0.8), 0 0 28px ${accent}30, inset 0 1px 0 rgba(255,255,255,0.14)` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 font-semibold text-sm tracking-wide">
                  <Hand className="w-4 h-4" style={{ color: accent }} />
                  Control por gestos
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar panel de gestos"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ul className="flex flex-col gap-2 mb-3">
                {LEGEND.map((row) => (
                  <li key={row.gesture} className="flex items-start gap-2.5 text-xs">
                    <span
                      className="mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center bg-white/10"
                      style={{ color: accent }}
                    >
                      {row.icon}
                    </span>
                    <span className="leading-snug">
                      <span className="block text-white/90">{row.gesture}</span>
                      <span className="block text-white/50">{row.action}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="flex items-start gap-2 text-[11px] leading-snug text-white/55 mb-3">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-300/80" />
                Privacidad: la cámara se procesa solo en tu dispositivo. No se graba ni se envía nada, y se apaga al
                desactivar el control.
              </p>

              {error && (
                <p role="alert" className="text-xs text-rose-300 mb-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => (active ? stop() : void start())}
                disabled={status === 'starting'}
                className="w-full h-10 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                style={
                  active
                    ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }
                    : { background: `${accent}26`, border: `1px solid ${accent}77`, color: accent }
                }
              >
                {active ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {status === 'starting' ? 'Iniciando cámara…' : active ? 'Apagar cámara' : 'Encender cámara'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Ocultar control por gestos' : 'Mostrar control por gestos'}
          aria-expanded={open}
          title="Control por gestos"
          className="relative w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white backdrop-blur-xl bg-black/40 border border-white/15 border-t-white/30 transition-all hover:scale-105 active:scale-95"
          style={active ? { boxShadow: `0 0 20px ${accent}70`, borderColor: `${accent}88` } : undefined}
        >
          <Hand className="w-5 h-5" style={active ? { color: accent } : undefined} />
          {active && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#34d399', boxShadow: '0 0 8px #34d399' }}
            />
          )}
        </button>
      </div>
    </>
  );
};

export default GestureControlHUD;
