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
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface LogoCropFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
}

const NEON_TINTS = [
  { id: 'none', name: 'Original', color: 'transparent' },
  { id: 'cyan', name: 'Cian', color: '#00f2fe' },
  { id: 'magenta', name: 'Magenta', color: '#ff088a' },
  { id: 'emerald', name: 'Neón Verde', color: '#39ff14' },
  { id: 'gold', name: 'Oro Neón', color: '#ffd700' },
  { id: 'violet', name: 'Violeta', color: '#9d00ff' },
];

export const LogoCropFilterModal: React.FC<LogoCropFilterModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
}) => {
  const { updateBlobSettings } = usePlayerStore();

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

  // Reset transforms on new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setIsGrayscale(false);
      setIsInverted(false);
      setActiveTint('none');
    }
  }, [isOpen, imageSrc]);

  // Pan interaction
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

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3.5, Math.max(0.5, prev + delta)));
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
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

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

      // Pan translation (mapped from preview viewport 240px to output 512px)
      const scaleFactor = outputSize / 240;
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
        ctx.strokeStyle = activeTint !== 'none' ? NEON_TINTS.find((t) => t.id === activeTint)?.color || '#00f2fe' : '#00f2fe';
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

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-backdrop material-thick pointer-events-auto select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="relative w-full max-w-lg bg-surface-overlay material-thick border border-border-subtle rounded-modal shadow-modal overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-fast">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0 bg-surface-base/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-accent-teal/15 border border-accent-teal/30 flex items-center justify-center shadow-subtle">
              <ImageIcon className="w-5 h-5 text-accent-teal" />
            </div>
            <div>
              <h3 className="text-text-primary font-semibold text-body tracking-wide">
                Editor y Recorte de Logo
              </h3>
              <p className="text-caption font-mono text-accent-teal uppercase tracking-widest">
                ENCUADRE CIRCULAR · FILTROS · TINTE NEÓN
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="min-h-11 min-w-11 p-2 text-text-secondary hover:text-text-primary rounded-control hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-border-subtle px-6 bg-surface-base/60 flex-shrink-0">
          <button
            onClick={() => setActiveTab('crop')}
            className={`min-h-11 flex items-center gap-2 py-3 px-4 text-caption font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'crop'
                ? 'border-accent-teal text-accent-teal -mb-px bg-accent-teal/10'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Move className="w-4 h-4" />
            <span>Encuadre y Recorte (1:1 Circular)</span>
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`min-h-11 flex items-center gap-2 py-3 px-4 text-caption font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'filters'
                ? 'border-accent-teal text-accent-teal -mb-px bg-accent-teal/10'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Filtros y Efectos Neón</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {/* Circular Interactive Viewport */}
          <div className="flex flex-col items-center justify-center">
            <div
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onWheel={handleWheel}
              className={`relative w-60 h-60 rounded-full border-2 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing shadow-modal bg-surface-base ${
                neonBorder
                  ? 'border-accent-teal shadow-subtle'
                  : 'border-border-subtle'
              }`}
            >
              {/* Overlay Crosshair Grid */}
              <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-full z-20" />
              <div className="absolute w-full h-[1px] bg-white/10 pointer-events-none z-20" />
              <div className="absolute h-full w-[1px] bg-white/10 pointer-events-none z-20" />

              {/* Tint overlay */}
              {activeTint !== 'none' && (
                <div
                  className="absolute inset-0 z-10 pointer-events-none mix-blend-color opacity-80"
                  style={{
                    backgroundColor: NEON_TINTS.find((t) => t.id === activeTint)?.color,
                  }}
                />
              )}

              {/* Image with transform & filter applied */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Logo Preview"
                draggable={false}
                className="max-w-none transition-transform duration-fast origin-center select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  filter: cssFilterString,
                }}
              />
            </div>
            <p className="text-caption font-mono text-text-tertiary mt-2 tracking-wider">
              ARRASTRA PARA MOVER · SCROLL PARA ZOOM
            </p>
          </div>

          {/* ── 1. CROP TAB CONTROLS ───────────────────────────────────── */}
          {activeTab === 'crop' && (
            <div className="space-y-4 pt-2">
              {/* Zoom Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                    <ZoomIn className="w-4 h-4 text-accent-teal" />
                    Zoom de Imagen
                  </span>
                  <span className="text-accent-teal font-mono font-tabular text-caption">{zoom.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                    aria-label="Reducir zoom"
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-control text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.05"
                    value={zoom}
                    aria-label="Nivel de zoom"
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 min-h-11 bg-transparent cursor-pointer accent-accent-teal"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                    aria-label="Aumentar zoom"
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-control text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Transform Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="min-h-11 py-2.5 px-3 bg-surface-base/80 hover:bg-surface-base border border-border-subtle rounded-control text-caption text-text-primary font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-accent-teal" />
                  <span>Rotar 90º ({rotation}º)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPan({ x: 0, y: 0 });
                    setZoom(1.0);
                    setRotation(0);
                  }}
                  className="min-h-11 py-2.5 px-3 bg-surface-base/80 hover:bg-surface-base border border-border-subtle rounded-control text-caption text-text-primary font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-status-warning" />
                  <span>Centrar y Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 2. FILTERS TAB CONTROLS ────────────────────────────────── */}
          {activeTab === 'filters' && (
            <div className="space-y-4 pt-2">
              {/* Brightness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                    <Sun className="w-4 h-4 text-status-warning" />
                    Brillo
                  </span>
                  <span className="text-status-warning font-mono font-tabular text-caption">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={brightness}
                  aria-label="Nivel de brillo"
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full min-h-11 bg-transparent cursor-pointer accent-status-warning"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                    <Contrast className="w-4 h-4 text-accent-teal" />
                    Contraste
                  </span>
                  <span className="text-accent-teal font-mono font-tabular text-caption">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={contrast}
                  aria-label="Nivel de contraste"
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full min-h-11 bg-transparent cursor-pointer accent-accent-teal"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-caption">
                  <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                    <Droplet className="w-4 h-4 text-accent-purple" />
                    Saturación
                  </span>
                  <span className="text-accent-purple font-mono font-tabular text-caption">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  aria-label="Nivel de saturación"
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full min-h-11 bg-transparent cursor-pointer accent-accent-purple"
                />
              </div>

              {/* Tinte Neón */}
              <div className="space-y-2 pt-1">
                <span className="text-caption font-mono text-accent-teal uppercase tracking-wider block">
                  Tinte de Color Neón:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {NEON_TINTS.map((tint) => (
                    <button
                      key={tint.id}
                      type="button"
                      onClick={() => setActiveTint(tint.id)}
                      className={`min-h-11 p-2.5 rounded-control border flex items-center gap-2 text-caption transition-all cursor-pointer ${
                        activeTint === tint.id
                          ? 'bg-surface-base border-accent-teal text-text-primary shadow-subtle'
                          : 'bg-surface-base/60 border-border-subtle text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-pill border border-border-subtle shrink-0"
                        style={{ backgroundColor: tint.color === 'transparent' ? '#fff' : tint.color }}
                      />
                      <span className="truncate">{tint.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles (Grayscale & Invert & Border) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsGrayscale(!isGrayscale)}
                  className={`min-h-11 p-2.5 rounded-control border text-caption font-medium transition-all cursor-pointer ${
                    isGrayscale
                      ? 'bg-white/20 border-white text-text-primary font-semibold'
                      : 'bg-surface-base/60 border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Blanco y Negro: {isGrayscale ? 'ON' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsInverted(!isInverted)}
                  className={`min-h-11 p-2.5 rounded-control border text-caption font-medium transition-all cursor-pointer ${
                    isInverted
                      ? 'bg-accent-teal/20 border-accent-teal text-accent-teal font-semibold'
                      : 'bg-surface-base/60 border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Invertir Colores: {isInverted ? 'ON' : 'OFF'}
                </button>
              </div>

              <div
                onClick={() => setNeonBorder(!neonBorder)}
                className={`min-h-11 p-3 rounded-card border cursor-pointer flex items-center justify-between transition-all ${
                  neonBorder
                    ? 'bg-accent-teal/15 border-accent-teal/50 text-accent-teal'
                    : 'bg-surface-base/60 border-border-subtle text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-teal" />
                  <span className="text-caption font-medium">Borde Circular de Neón Luminoso</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-pill border flex items-center justify-center ${
                    neonBorder ? 'border-accent-teal bg-accent-teal' : 'border-border-subtle'
                  }`}
                >
                  {neonBorder && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle flex items-center justify-between bg-surface-base/60 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 py-2 text-text-secondary hover:text-text-primary text-caption font-medium transition-colors cursor-pointer rounded-control hover:bg-white/10"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyAndSave}
            className="min-h-11 px-6 py-2.5 bg-accent-teal text-black font-semibold rounded-control text-caption tracking-wider uppercase transition-all shadow-subtle flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Guardar y Aplicar Logo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoCropFilterModal;
