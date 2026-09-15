import React from 'react';
import { X, Keyboard, Play, Volume2, Sparkles, Sliders, Music, Maximize } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface ShortcutRowProps {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ keys, description, icon }) => (
  <div className="flex items-center justify-between py-2 px-2.5 rounded-[10px] hover:bg-white/[0.04] transition-colors group">
    <div className="flex items-center gap-2.5 text-xs text-white/80">
      {icon && <span className="text-white/40 group-hover:text-white/70 transition-colors">{icon}</span>}
      <span>{description}</span>
    </div>
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] font-mono font-medium rounded-[6px] border border-white/15 bg-white/[0.06] text-white/90 shadow-sm"
        >
          {k}
        </kbd>
      ))}
    </div>
  </div>
);

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen, isLucid, lucidTheme, lucidPrimaryColor } =
    usePlayerStore();

  if (!isShortcutsModalOpen) return null;

  const accentColor = isLucid ? lucidPrimaryColor || lucidTheme.primary || '#00e5ff' : '#00f2fe';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-xl p-4 animate-in fade-in duration-200"
      onClick={() => setShortcutsModalOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-[20px] bg-[#0c101a]/95 backdrop-blur-3xl border border-white/[0.08] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.1)] p-5 text-white flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center border shadow-sm"
              style={{
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}40`,
                color: accentColor,
              }}
            >
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                Atajos de Teclado
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                  STUDIO
                </span>
              </h2>
              <p className="text-[11px] text-white/40 font-mono">Control táctil de alta precisión</p>
            </div>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Transporte y Audio */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 px-2.5">
            Transporte & Control
          </span>
          <div className="space-y-0.5 mt-1">
            <ShortcutRow keys={['Espacio']} description="Reproducir / Pausar pista" icon={<Play className="w-3.5 h-3.5" />} />
            <ShortcutRow keys={['←', '→']} description="Retroceder / Adelantar 5 segundos" />
            <ShortcutRow keys={['↑', '↓']} description="Subir / Bajar volumen (±5%)" icon={<Volume2 className="w-3.5 h-3.5" />} />
            <ShortcutRow keys={['M']} description="Silenciar / Restaurar audio (Mute)" />
          </div>
        </div>

        {/* Section 2: Visualización y 3D */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 px-2.5">
            Visualización & Escena 3D
          </span>
          <div className="space-y-0.5 mt-1">
            <ShortcutRow keys={['V']} description="Alternar visualizador (Esfera / Void / Fiesta)" icon={<Sparkles className="w-3.5 h-3.5" />} />
            <ShortcutRow keys={['I']} description="Instrumentos 3D de Aire (Synth / Drums / Theremin)" />
            <ShortcutRow keys={['1', '—', '6']} description="Seleccionar forma 3D (Esfera, Anillos, Toroide...)" />
            <ShortcutRow keys={['F']} description="Modo Pantalla Completa" icon={<Maximize className="w-3.5 h-3.5" />} />
          </div>
        </div>

        {/* Section 3: Paneles de Estudio */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 px-2.5">
            Paneles de Estudio & Telemetría
          </span>
          <div className="space-y-0.5 mt-1">
            <ShortcutRow keys={['E']} description="Master Equalizer Studio Pro (10 Bandas)" icon={<Sliders className="w-3.5 h-3.5" />} />
            <ShortcutRow keys={['L']} description="Panel de Letras & Karaoke Sincronizado" icon={<Music className="w-3.5 h-3.5" />} />
            <ShortcutRow keys={['?']} description="Mostrar / Ocultar este menú de atajos" />
            <ShortcutRow keys={['Esc']} description="Cerrar modal o ventana activa" />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/40 font-mono">
          <span>Pulsa <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/80 text-[10px]">Esc</kbd> para salir</span>
          <span className="text-white/25">Aura3D Studio DSP</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
