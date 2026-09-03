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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl pointer-events-auto select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="relative w-full max-w-lg bg-[#080b18]/95 border border-cyan-400/30 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <ImageIcon className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm tracking-wide">
                Editor y Recorte de Logo
              </h3>
              <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">
                ENCUADRE CIRCULAR · FILTROS · TINTE NEÓN
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-white/8 px-6 bg-black/40 flex-shrink-0">
          <button
            onClick={() => setActiveTab('crop')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'crop'
                ? 'border-cyan-400 text-cyan-300 -mb-px bg-cyan-500/10'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Encuadre y Recorte (1:1 Circular)</span>
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'filters'
                ? 'border-cyan-400 text-cyan-300 -mb-px bg-cyan-500/10'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
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
              className={`relative w-60 h-60 rounded-full border-2 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_0_40px_rgba(0,0,0,0.8)] bg-black/90 ${
                neonBorder
                  ? 'border-cyan-400 shadow-[0_0_25px_rgba(0,242,254,0.4)]'
                  : 'border-white/20'
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
                className="max-w-none transition-transform duration-75 origin-center select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  filter: cssFilterString,
                }}
              />
            </div>
            <p className="text-[10px] font-mono text-white/40 mt-2 tracking-wider">
              ARRASTRA PARA MOVER · SCROLL PARA ZOOM
            </p>
          </div>

          {/* ── 1. CROP TAB CONTROLS ───────────────────────────────────── */}
          {activeTab === 'crop' && (
            <div className="space-y-4 pt-2">
              {/* Zoom Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1.5 font-medium">
                    <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                    Zoom de Imagen
                  </span>
                  <span className="text-cyan-300 font-mono text-xs">{zoom.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-white/40 cursor-pointer hover:text-white" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} />
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                  />
                  <ZoomIn className="w-4 h-4 text-white/40 cursor-pointer hover:text-white" onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))} />
                </div>
              </div>

              {/* Quick Transform Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rotar 90º ({rotation}º)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPan({ x: 0, y: 0 });
                    setZoom(1.0);
                    setRotation(0);
                  }}
                  className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1.5 font-medium">
                    <Sun className="w-3.5 h-3.5 text-yellow-400" />
                    Brillo
                  </span>
                  <span className="text-yellow-300 font-mono text-xs">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-yellow-400"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1.5 font-medium">
                    <Contrast className="w-3.5 h-3.5 text-cyan-400" />
                    Contraste
                  </span>
                  <span className="text-cyan-300 font-mono text-xs">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1.5 font-medium">
                    <Droplet className="w-3.5 h-3.5 text-pink-400" />
                    Saturación
                  </span>
                  <span className="text-pink-300 font-mono text-xs">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg cursor-pointer accent-pink-500"
                />
              </div>

              {/* Tinte Neón */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider block">
                  Tinte de Color Neón:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {NEON_TINTS.map((tint) => (
                    <button
                      key={tint.id}
                      type="button"
                      onClick={() => setActiveTint(tint.id)}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                        activeTint === tint.id
                          ? 'bg-white/15 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                          : 'bg-white/5 border-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/30"
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
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isGrayscale
                      ? 'bg-white/20 border-white text-white font-semibold'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  Blanco y Negro: {isGrayscale ? 'ON' : 'OFF'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsInverted(!isInverted)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isInverted
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                      : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  Invertir Colores: {isInverted ? 'ON' : 'OFF'}
                </button>
              </div>

              <div
                onClick={() => setNeonBorder(!neonBorder)}
                className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                  neonBorder
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                    : 'bg-white/[0.03] border-white/8 text-white/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-medium">Borde Circular de Neón Luminoso</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    neonBorder ? 'border-cyan-400 bg-cyan-400' : 'border-white/20'
                  }`}
                >
                  {neonBorder && <Check className="w-3 h-3 text-black stroke-[3]" />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/8 flex items-center justify-between bg-black/40 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-white/50 hover:text-white text-xs font-medium transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyAndSave}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-black font-semibold rounded-xl text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,242,254,0.4)] flex items-center gap-1.5"
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
