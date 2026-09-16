import React from 'react';
import { X, Keyboard, Play, Volume2, Sparkles, Sliders, Music, Maximize } from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';

interface ShortcutRowProps {
  keys: string[];
  description: string;
  icon?: React.ReactNode;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ keys, description, icon }) => (
  <div className="flex items-center justify-between py-2 px-2.5 rounded-control hover:bg-surface-base/60 transition-colors group">
    <div className="flex items-center gap-2.5 text-caption text-text-secondary">
      {icon && <span className="text-text-tertiary group-hover:text-text-primary transition-colors">{icon}</span>}
      <span>{description}</span>
    </div>
    <div className="flex items-center gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="min-w-[24px] h-6 px-1.5 flex items-center justify-center text-caption font-mono font-medium rounded-badge border border-border-subtle bg-surface-base text-text-primary shadow-subtle"
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

  const accentColor = isLucid ? (lucidPrimaryColor || lucidTheme.primary || 'var(--ios-teal)') : 'var(--ios-teal)';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-backdrop material-thick p-4 animate-in fade-in duration-fast"
      onClick={() => setShortcutsModalOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-modal bg-surface-overlay material-thick border border-border-subtle shadow-modal p-5 text-text-primary flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-control flex items-center justify-center border border-accent-teal/30 bg-accent-teal/15 text-accent-teal shadow-subtle"
            >
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-body font-bold tracking-tight flex items-center gap-2">
                Atajos de Teclado
                <span className="text-caption uppercase font-mono px-2 py-0.5 rounded-pill bg-accent-teal/15 text-accent-teal border border-accent-teal/30 font-bold">
                  STUDIO
                </span>
              </h2>
              <p className="text-caption text-text-tertiary font-mono">Control táctil de alta precisión</p>
            </div>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="min-h-11 min-w-11 p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Transporte y Audio */}
        <div className="space-y-1">
          <span className="text-caption font-mono uppercase tracking-widest text-text-tertiary px-2.5">
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
          <span className="text-caption font-mono uppercase tracking-widest text-text-tertiary px-2.5">
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
          <span className="text-caption font-mono uppercase tracking-widest text-text-tertiary px-2.5">
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
        <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-caption text-text-tertiary font-mono">
          <span>Pulsa <kbd className="px-1.5 py-0.5 rounded-badge bg-white/10 text-text-primary text-caption font-mono">Esc</kbd> para salir</span>
          <span className="text-text-tertiary">Aura3D Studio DSP</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
