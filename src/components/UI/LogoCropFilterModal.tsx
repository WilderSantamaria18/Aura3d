import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Palette,
  Upload,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useTrackLogoStore } from '../../stores/trackLogoStore';
import { useActiveLogo } from '../../hooks/useActiveLogo';
import { LogoDisc } from './LogoDisc';
import {
  DEFAULT_LOGO_APPEARANCE,
  NEON_TINTS,
  downscaleImage,
} from '../../utils/logoAppearance';
import type { LogoAppearance } from '../../types/audio';

export interface LogoCropFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Imagen recién elegida en Ajustes, pendiente de guardar (solo canciones locales) */
  pendingImage?: string | null;
}

const PREVIEW_SIZE = 192;

type Scope = 'track' | 'all';

const SOURCE_COPY: Record<string, string> = {
  spotify: 'Spotify: la carátula cambia con cada canción y tu estilo se aplica encima.',
  youtube: 'YouTube: la carátula cambia con cada video y tu estilo se aplica encima.',
  local: 'Archivo local: puedes usar tu propia imagen para esta canción.',
};

export const LogoCropFilterModal: React.FC<LogoCropFilterModalProps> = ({ isOpen, onClose, pendingImage }) => {
  const updateBlobSettings = usePlayerStore((s) => s.updateBlobSettings);
  const globalAppearance = usePlayerStore((s) => s.blobSettings.logoAppearance);
  const setOverride = useTrackLogoStore((s) => s.setOverride);
  const clearOverride = useTrackLogoStore((s) => s.clearOverride);
  const logo = useActiveLogo();

  const canReplaceImage = !logo.streaming;

  // Imagen mostrada en el editor: una recién elegida, o la que ya resuelve la canción
  const [newImage, setNewImage] = useState<string | null>(null);
  const previewSrc = newImage || logo.src;

  const [scope, setScope] = useState<Scope>('all');
  const [appearance, setAppearance] = useState<LogoAppearance>(DEFAULT_LOGO_APPEARANCE);
  const [activeTab, setActiveTab] = useState<'crop' | 'filters'>('crop');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Al abrir: partir del estilo que ya se ve en pantalla. Las canciones locales editan "esta canción"
  // por defecto; en streaming el estilo es global porque la imagen cambia sola.
  useEffect(() => {
    if (!isOpen) return;
    setNewImage(pendingImage ?? null);
    setScope(logo.track && !logo.streaming ? 'track' : 'all');
    setAppearance(logo.appearance);
    setActiveTab('crop');
    setError(null);
    // Solo al abrir: no reiniciar la edición si la canción cambia mientras el editor está abierto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const patch = (partial: Partial<LogoAppearance>) => setAppearance((a) => ({ ...a, ...partial }));

  // ── Arrastre (ratón y táctil) con Pointer Events ──
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: appearance.panX, panY: appearance.panY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    patch({
      panX: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x) / PREVIEW_SIZE,
      panY: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y) / PREVIEW_SIZE,
    });
  };
  const onPointerUp = () => {
    isDraggingRef.current = false;
  };
  const onWheel = (e: React.WheelEvent) => {
    patch({ zoom: Math.min(3.5, Math.max(0.5, appearance.zoom - e.deltaY * 0.0015)) });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewImage(ev.target?.result as string);
      patch({ panX: 0, panY: 0, zoom: 1, rotation: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Imagen propia: se reduce y se guarda por canción (o como imagen por defecto si no hay canción)
      if (newImage && canReplaceImage) {
        const small = await downscaleImage(newImage);
        if (logo.key) setOverride(logo.key, { src: small });
        else updateBlobSettings({ customLogoUrl: small });
      }

      // 2. Estilo: "esta canción" o "todas". Al elegir todas se quita el estilo propio para que no lo tape.
      if (scope === 'track' && logo.key) {
        setOverride(logo.key, { appearance });
      } else {
        updateBlobSettings({ logoAppearance: appearance });
        if (logo.key && logo.hasTrackAppearance) clearOverride(logo.key, ['appearance']);
      }
      onClose();
    } catch {
      setError('No se pudo guardar la imagen. Prueba con otra o un archivo más pequeño.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (scope === 'track' && logo.key) {
      clearOverride(logo.key);
    } else {
      updateBlobSettings({ logoAppearance: null });
    }
    setNewImage(null);
    setAppearance(DEFAULT_LOGO_APPEARANCE);
  };

  if (!isOpen) return null;

  const sourceCopy = logo.track ? SOURCE_COPY[logo.track.sourceType] : null;
  const tintEntry = NEON_TINTS.find((t) => t.id === appearance.tint);

  return (
    <>
      <div className="fixed inset-0 z-40 pointer-events-auto" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Logo de la canción"
        className="fixed top-12 sm:top-14 right-3 sm:right-5 left-3 sm:left-auto sm:w-[385px] max-h-[min(660px,calc(100vh-4.5rem))] z-50 rounded-[24px] p-4 shadow-[0_28px_70px_rgba(0,0,0,0.95)] flex flex-col gap-3 pointer-events-auto liquid-glass liquid-glass-card border border-white/15 border-t-white/30 text-white font-sans select-none overflow-y-auto custom-scrollbar"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/[0.08]">
          <div className="min-w-0">
            <h3 className="text-white font-medium text-[14px] tracking-tight">Logo de la canción</h3>
            {sourceCopy && <p className="text-[11px] text-white/55 mt-0.5 leading-snug">{sourceCopy}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 shrink-0 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar editor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alcance del cambio */}
        {logo.track && (
          <div role="radiogroup" aria-label="Aplicar a" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/35">
            {(
              [
                { id: 'track', label: 'Solo esta canción' },
                { id: 'all', label: 'Todas las canciones' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                role="radio"
                aria-checked={scope === opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  scope === opt.id ? 'bg-white/[0.14] text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Vista previa: mismo componente que el visualizador */}
        <div className="flex flex-col items-center pt-1">
          {previewSrc ? (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              className="rounded-full cursor-grab active:cursor-grabbing touch-none"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            >
              <LogoDisc src={previewSrc} size={PREVIEW_SIZE} appearance={appearance}>
                <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
              </LogoDisc>
            </div>
          ) : (
            <div
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              className="rounded-full border border-dashed border-white/20 flex flex-col items-center justify-center p-4 text-center bg-white/[0.02]"
            >
              <ImageIcon className="w-8 h-8 text-white/30 mb-2" />
              <p className="text-[12px] text-white/70">Esta canción no tiene carátula</p>
            </div>
          )}
          <p className="text-[11px] text-white/45 mt-3">Arrastra para mover · rueda para acercar</p>
        </div>

        {/* Imagen propia (solo si no es Spotify/YouTube) */}
        {canReplaceImage ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.09] rounded-xl text-[13px] font-medium text-white/85 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-white/60" />
            {logo.hasTrackImage || newImage ? 'Cambiar imagen de esta canción' : 'Usar mi propia imagen'}
          </button>
        ) : (
          <p className="text-[12px] text-white/50 leading-snug">
            Para usar una imagen propia, reproduce un archivo local. En {logo.track?.sourceType === 'spotify' ? 'Spotify' : 'YouTube'} la carátula la define cada canción.
          </p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {/* Pestañas */}
        <div role="tablist" className="grid grid-cols-2 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          {(
            [
              { id: 'crop', label: 'Ajustar', icon: Move },
              { id: 'filters', label: 'Filtros', icon: Palette },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'crop' && (
          <div className="space-y-3">
            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-white/80">Zoom</span>
                <span className="text-white/60 tabular-nums">{appearance.zoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut
                  className="w-4 h-4 text-white/40 cursor-pointer hover:text-white"
                  onClick={() => patch({ zoom: Math.max(0.5, appearance.zoom - 0.2) })}
                />
                <input
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.05"
                  value={appearance.zoom}
                  onChange={(e) => patch({ zoom: parseFloat(e.target.value) })}
                  aria-label="Zoom"
                  className="flex-1 h-1.5 bg-white/[0.08] rounded-full cursor-pointer accent-white"
                />
                <ZoomIn
                  className="w-4 h-4 text-white/40 cursor-pointer hover:text-white"
                  onClick={() => patch({ zoom: Math.min(3.5, appearance.zoom + 0.2) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => patch({ rotation: (appearance.rotation + 90) % 360 })}
                className="py-2.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[12.5px] text-white/80 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-white/60" />
                Rotar
              </button>
              <button
                type="button"
                onClick={() => patch({ panX: 0, panY: 0, zoom: 1, rotation: 0 })}
                className="py-2.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[12.5px] text-white/80 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white/60" />
                Centrar
              </button>
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-3">
            {(
              [
                { key: 'brightness', label: 'Brillo', min: 50, max: 160 },
                { key: 'contrast', label: 'Contraste', min: 50, max: 160 },
                { key: 'saturation', label: 'Saturación', min: 0, max: 200 },
              ] as const
            ).map((f) => (
              <div key={f.key} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-white/80">{f.label}</span>
                  <span className="text-white/60 tabular-nums">{appearance[f.key]}%</span>
                </div>
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  value={appearance[f.key]}
                  onChange={(e) => patch({ [f.key]: parseInt(e.target.value, 10) } as Partial<LogoAppearance>)}
                  aria-label={f.label}
                  className="w-full h-1.5 bg-white/[0.08] rounded-full cursor-pointer accent-white"
                />
              </div>
            ))}

            <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-2.5">
              <span className="text-[12.5px] text-white/80 block">Tinte</span>
              <div className="grid grid-cols-3 gap-2">
                {NEON_TINTS.map((tint) => (
                  <button
                    key={tint.id}
                    type="button"
                    aria-pressed={appearance.tint === tint.id}
                    onClick={() => patch({ tint: tint.id })}
                    className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                      appearance.tint === tint.id
                        ? 'bg-white/15 border-white/70 text-white'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                      style={{ backgroundColor: tint.color === 'transparent' ? '#ffffff' : tint.color }}
                    />
                    <span className="truncate">{tint.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'grayscale', label: 'B/N' },
                  { key: 'invert', label: 'Invertir' },
                  { key: 'neonBorder', label: 'Borde' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="switch"
                  aria-checked={appearance[t.key]}
                  onClick={() => patch({ [t.key]: !appearance[t.key] } as Partial<LogoAppearance>)}
                  className={`py-2 rounded-xl border text-[12.5px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    appearance[t.key]
                      ? 'bg-white/15 border-white/70 text-white'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:text-white'
                  }`}
                >
                  {appearance[t.key] && <Check className="w-3.5 h-3.5" />}
                  {t.label}
                </button>
              ))}
            </div>
            {appearance.neonBorder && (
              <p className="text-[11.5px] text-white/45">
                El borde usa el color del tinte{tintEntry && tintEntry.id !== 'none' ? ` (${tintEntry.name})` : ' (cian por defecto)'}.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] text-rose-300">
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!globalAppearance && !logo.hasTrackAppearance && !logo.hasTrackImage && !newImage}
            className="px-3 py-2 text-white/60 hover:text-white disabled:opacity-35 disabled:hover:text-white/60 text-[12.5px] font-medium rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Restablecer
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-white/60 hover:text-white text-[12.5px] font-medium rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !previewSrc}
              className={`px-5 py-2 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 ${
                previewSrc && !saving
                  ? 'bg-white text-black hover:bg-white/90 cursor-pointer'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoCropFilterModal;
