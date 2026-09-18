import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Sun,
  Contrast,
  Droplet,
  Sparkles,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Palette,
  Upload,
  Music,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

export interface LogoCropFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  onImageChange?: (newSrc: string) => void;
}

const NEON_TINTS = [
  { id: 'none', name: 'Original', color: 'transparent' },
  { id: 'cyan', name: 'Cian', color: '#00f2fe' },
  { id: 'magenta', name: 'Magenta', color: '#ff088a' },
  { id: 'emerald', name: 'Verde', color: '#39ff14' },
  { id: 'gold', name: 'Oro', color: '#ffd700' },
  { id: 'violet', name: 'Violeta', color: '#9d00ff' },
];

const PREVIEW_SIZE = 192; // 192px = w-48 h-48

export const LogoCropFilterModal: React.FC<LogoCropFilterModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onImageChange,
}) => {
  const { updateBlobSettings, currentTrack } = usePlayerStore();

  // Local active image source (allows picking/uploading directly in the card)
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(imageSrc);

  // Transform states
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // in degrees
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Filter states
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [activeTint, setActiveTint] = useState('none');
  const [neonBorder, setNeonBorder] = useState(true);

  const [activeTab, setActiveTab] = useState<'crop' | 'filters'>('crop');
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize on new image or modal open
  useEffect(() => {
    if (isOpen) {
      setActiveImageSrc(imageSrc || currentTrack?.coverUrl || null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setIsGrayscale(false);
      setIsInverted(false);
      setActiveTint('none');
      setNeonBorder(true);
    }
  }, [isOpen, imageSrc, currentTrack?.coverUrl]);

  // Mouse pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan interaction for iOS / Touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3.5, Math.max(0.5, prev + delta)));
  };

  // File upload handler directly inside the card
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setActiveImageSrc(result);
        if (onImageChange) onImageChange(result);
        setPan({ x: 0, y: 0 });
        setZoom(1.0);
        setRotation(0);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Generate CSS filter string
  const cssFilterString = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
    isGrayscale ? 'grayscale(100%)' : '',
    isInverted ? 'invert(100%)' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Export cropped circle image to Canvas and save into Store
  const handleApplyAndSave = () => {
    if (!activeImageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeImageSrc;

    img.onload = () => {
      const outputSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Circular clipping mask
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2 - 4, 0, Math.PI * 2);
      ctx.clip();

      // 2. Apply CSS filters via canvas filter property
      ctx.filter = cssFilterString;

      // 3. Transformations (Translate, Rotate, Scale)
      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Pan translation (mapped from preview viewport PREVIEW_SIZE to output 512px)
      const scaleFactor = outputSize / PREVIEW_SIZE;
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

      // Draw image centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // 4. Apply Color Tint if selected
      if (activeTint !== 'none') {
        const tint = NEON_TINTS.find((t) => t.id === activeTint);
        if (tint && tint.color !== 'transparent') {
          ctx.save();
          ctx.globalCompositeOperation = 'color';
          ctx.fillStyle = tint.color;
          ctx.fillRect(0, 0, outputSize, outputSize);
          ctx.restore();
        }
      }

      // 5. Optional Neon Ring Border on the edge
      if (neonBorder) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2 - 6, 0, Math.PI * 2);
        ctx.strokeStyle =
          activeTint !== 'none'
            ? NEON_TINTS.find((t) => t.id === activeTint)?.color || '#00f2fe'
            : '#00f2fe';
        ctx.lineWidth = 8;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
      }

      // Convert to Data URL and update store
      const croppedDataUrl = canvas.toDataURL('image/png', 0.95);
      updateBlobSettings({ customLogoUrl: croppedDataUrl });
      onClose();
    };
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop sutil para descartar con un clic sin cegar el visualizador */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] pointer-events-auto sm:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card Flotante iOS / visionOS Liquid Glass */}
      <div
        className="fixed top-12 sm:top-14 right-3 sm:right-5 left-3 sm:left-auto sm:w-[385px] max-h-[min(630px,calc(100vh-4.5rem))] z-50 rounded-[24px] p-4 shadow-[0_28px_70px_rgba(0,0,0,0.95)] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto liquid-glass liquid-glass-card bg-[#0a0f1d]/94 backdrop-blur-3xl border border-white/15 border-t-white/30 text-white font-sans select-none overflow-y-auto custom-scrollbar"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 1. iOS Header ── */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,242,254,0.25)]">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-xs tracking-tight">
                Editor de Logo & Carátula
              </h3>
              <p className="text-[9px] font-mono text-cyan-400/70 uppercase tracking-wider">
                ENCUADRE CIRCULAR · FILTROS NEÓN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="Cerrar editor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── 2. iOS Segmented Control ── */}
        <div className="grid grid-cols-2 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex-shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'crop'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 shadow-sm font-semibold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">Encuadre & Zoom</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'filters'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 shadow-sm font-semibold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono">Filtros & Neón</span>
          </button>
        </div>

        {/* ── 3. Viewport Circular Interactivo ── */}
        <div className="flex flex-col items-center justify-center pt-1">
          {activeImageSrc ? (
            <>
              <div
                ref={viewportRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onWheel={handleWheel}
                style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px` }}
                className={`relative rounded-full border-2 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_0_35px_rgba(0,0,0,0.85)] bg-black/90 transition-all ${
                  neonBorder
                    ? 'border-cyan-400 shadow-[0_0_22px_rgba(0,242,254,0.35)]'
                    : 'border-white/20'
                }`}
              >
                {/* Retícula de Precisión visionOS */}
                <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-full z-20" />
                <div className="absolute w-full h-[1px] bg-white/10 pointer-events-none z-20" />
                <div className="absolute h-full w-[1px] bg-white/10 pointer-events-none z-20" />

                {/* Tinte de Color Activo */}
                {activeTint !== 'none' && (
                  <div
                    className="absolute inset-0 z-10 pointer-events-none mix-blend-color opacity-80"
                    style={{
                      backgroundColor: NEON_TINTS.find((t) => t.id === activeTint)?.color,
                    }}
                  />
                )}

                {/* Imagen Transformada */}
                <img
                  ref={imgRef}
                  src={activeImageSrc}
                  alt="Previsualización de Logo"
                  draggable={false}
                  className="max-w-none transition-transform duration-75 origin-center select-none"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                    filter: cssFilterString,
                  }}
                />
              </div>

              <p className="text-[8.5px] font-mono text-white/40 mt-1.5 tracking-wider text-center">
                ARRASTRA PARA MOVER · SCROLL PARA ZOOM
              </p>
            </>
          ) : (
            /* Estado cuando aún no hay imagen seleccionada */
            <div
              style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px` }}
              className="rounded-full border border-dashed border-white/20 flex flex-col items-center justify-center p-3 text-center bg-white/[0.02]"
            >
              <ImageIcon className="w-8 h-8 text-white/30 mb-2" />
              <p className="text-[10px] font-medium text-white/70">Sin imagen activa</p>
              <p className="text-[8px] text-white/40 mt-0.5">Sube una imagen o usa la carátula</p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2.5 px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 rounded-lg text-[9px] font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Seleccionar Imagen</span>
              </button>

              {currentTrack?.coverUrl && (
                <button
                  type="button"
                  onClick={() => setActiveImageSrc(currentTrack.coverUrl || null)}
                  className="mt-1 text-[8px] text-white/50 hover:text-white underline font-mono flex items-center gap-1 cursor-pointer"
                >
                  <Music className="w-2.5 h-2.5" />
                  <span>Usar carátula actual</span>
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* ── 4. PESTAÑA: ENCUADRE & ZOOM ── */}
        {activeTab === 'crop' && (
          <div className="space-y-3 pt-1">
            {/* Zoom Slider */}
            <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/70 flex items-center gap-1.5 font-medium">
                  <ZoomIn className="w-3 h-3 text-cyan-400" />
                  Zoom de Imagen:
                </span>
                <span className="text-cyan-300 font-bold tabular-nums">{zoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut
                  className="w-3.5 h-3.5 text-white/40 cursor-pointer hover:text-white"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                />
                <input
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
                />
                <ZoomIn
                  className="w-3.5 h-3.5 text-white/40 cursor-pointer hover:text-white"
                  onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                />
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="py-2 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[10px] text-white/80 font-mono flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-cyan-400" />
                <span>Rotar 90º ({rotation}º)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(1.0);
                  setRotation(0);
                }}
                className="py-2 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[10px] text-white/80 font-mono flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-pink-400" />
                <span>Centrar & Reset</span>
              </button>
            </div>

            {/* Cambiar o Subir Imagen Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1.5 px-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-[10px] font-mono text-white/70 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3 text-cyan-300" />
              <span>{activeImageSrc ? 'Cambiar Imagen / Subir PNG' : 'Subir Nueva Imagen'}</span>
            </button>
          </div>
        )}

        {/* ── 5. PESTAÑA: FILTROS & EFECTOS NEÓN ── */}
        {activeTab === 'filters' && (
          <div className="space-y-2.5 pt-1">
            {/* Brightness */}
            <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/70 flex items-center gap-1 font-medium">
                  <Sun className="w-3 h-3 text-yellow-400" />
                  Brillo:
                </span>
                <span className="text-yellow-300 font-bold tabular-nums">{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="160"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-yellow-400"
              />
            </div>

            {/* Contrast */}
            <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/70 flex items-center gap-1 font-medium">
                  <Contrast className="w-3 h-3 text-cyan-400" />
                  Contraste:
                </span>
                <span className="text-cyan-300 font-bold tabular-nums">{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="160"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Saturation */}
            <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/70 flex items-center gap-1 font-medium">
                  <Droplet className="w-3 h-3 text-pink-400" />
                  Saturación:
                </span>
                <span className="text-pink-300 font-bold tabular-nums">{saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-white/[0.08] rounded-full cursor-pointer accent-pink-500"
              />
            </div>

            {/* Tinte de Color Neón */}
            <div className="p-2 bg-white/[0.03] rounded-xl border border-white/[0.08] space-y-1.5">
              <span className="text-[9px] font-mono text-cyan-300 uppercase tracking-wider block font-semibold">
                Tinte Neón:
              </span>
              <div className="grid grid-cols-3 gap-1">
                {NEON_TINTS.map((tint) => (
                  <button
                    key={tint.id}
                    type="button"
                    onClick={() => setActiveTint(tint.id)}
                    className={`py-1 px-1.5 rounded-lg border flex items-center gap-1.5 text-[9px] font-mono transition-all cursor-pointer ${
                      activeTint === tint.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm font-semibold'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30 flex-shrink-0"
                      style={{
                        backgroundColor: tint.color === 'transparent' ? '#ffffff' : tint.color,
                        boxShadow:
                          tint.color !== 'transparent' && activeTint === tint.id
                            ? `0 0 8px ${tint.color}`
                            : undefined,
                      }}
                    />
                    <span className="truncate">{tint.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles (Blanco y Negro / Invertir / Borde Neón) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setIsGrayscale(!isGrayscale)}
                className={`py-1.5 px-2 rounded-xl border text-[9.5px] font-mono font-medium transition-all cursor-pointer ${
                  isGrayscale
                    ? 'bg-white/20 border-white text-white font-semibold'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white'
                }`}
              >
                B/N: {isGrayscale ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => setIsInverted(!isInverted)}
                className={`py-1.5 px-2 rounded-xl border text-[9.5px] font-mono font-medium transition-all cursor-pointer ${
                  isInverted
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-semibold shadow-sm'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white'
                }`}
              >
                Invertir: {isInverted ? 'ON' : 'OFF'}
              </button>
            </div>

            <div
              onClick={() => setNeonBorder(!neonBorder)}
              className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                neonBorder
                  ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-medium font-mono">Borde Neón Luminoso</span>
              </div>
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                  neonBorder ? 'border-cyan-400 bg-cyan-400' : 'border-white/20'
                }`}
              >
                {neonBorder && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. iOS Action Footer ── */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-white/60 hover:text-white text-[11px] font-medium rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyAndSave}
            disabled={!activeImageSrc}
            className={`px-4 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
              activeImageSrc
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-black shadow-[0_0_18px_rgba(0,242,254,0.35)] cursor-pointer'
                : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Guardar y Aplicar</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default LogoCropFilterModal;
