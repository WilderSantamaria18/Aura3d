import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { LUCID_THEMES } from '../../types/audio';
import { Sparkles, Palette, ChevronDown } from 'lucide-react';

export const LucidToggle: React.FC = () => {
  const {
    isLucid,
    toggleLucidMode,
    lucidTheme,
    setLucidTheme,
    lucidPrimaryColor,
    lucidSecondaryColor,
    setLucidPrimaryColor,
    setLucidSecondaryColor,
  } = usePlayerStore();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Close palette on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    if (isPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaletteOpen]);

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={paletteRef}>
      {/* Main Lucid Mode Button */}
      <div
        className={`inline-flex items-center rounded-pill border text-caption font-medium tracking-wide transition-all duration-base p-0.5 ${
          isLucid
            ? 'material-regular border-border-medium'
            : 'bg-white/[0.05] border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/[0.08]'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: `${lucidPrimaryColor}18`,
                borderColor: `${lucidPrimaryColor}60`,
                boxShadow: `0 0 20px ${lucidTheme.glow}`,
                color: 'var(--text-primary)',
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={toggleLucidMode}
          className="h-7 sm:h-7.5 flex items-center gap-1.5 px-2.5 rounded-pill transition-transform active:scale-[0.97] text-caption btn-spring cursor-pointer"
          title={isLucid ? 'Desactivar Modo Lúcido' : 'Activar Modo Lúcido'}
          aria-label={isLucid ? 'Desactivar Modo Lúcido' : 'Activar Modo Lúcido'}
        >
          {isLucid ? (
            <span
              className="w-2 h-2 rounded-pill animate-ping"
              style={{ backgroundColor: lucidPrimaryColor }}
            />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          )}
          <span className="hidden min-[400px]:inline">{isLucid ? 'Lúcido' : 'Lúcido'}</span>
        </button>

        {/* Color Palette Dropdown Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsPaletteOpen((prev) => !prev);
          }}
          className="w-6 h-6 p-0.5 rounded-pill hover:bg-white/20 transition-all text-text-secondary hover:text-text-primary mr-0.5 flex items-center justify-center cursor-pointer btn-spring"
          title="Elegir entre 10 Paletas Bicolor o Personalizar HEX"
          aria-label="Desplegar paleta de colores lúcidos"
          aria-expanded={isPaletteOpen}
        >
          <div
            className="w-3.5 h-3.5 rounded-pill border border-border-highlight shadow-subtle flex items-center justify-center transition-transform"
            style={{ backgroundColor: isLucid ? lucidPrimaryColor : 'var(--accent-cyan)' }}
          >
            <ChevronDown
              className={`w-2 h-2 text-black stroke-[3] transition-transform duration-fast ${
                isPaletteOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
      </div>

      {/* Inline Quick Color Pickers for Lucid Mode (Desktop quick access) */}
      {isLucid && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-pill bg-surface-dock/80 border border-border-subtle material-regular shadow-card h-7 sm:h-7.5">
          <div className="flex items-center gap-1" title="Color Primario Lúcido">
            <input
              type="color"
              value={lucidPrimaryColor}
              aria-label="Color Primario Lúcido"
              onChange={(e) => setLucidPrimaryColor(e.target.value)}
              className="w-4 h-4 rounded-pill cursor-pointer border-0 p-0 bg-transparent overflow-hidden"
            />
          </div>
          <div className="flex items-center gap-1" title="Color Secundario Lúcido">
            <input
              type="color"
              value={lucidSecondaryColor}
              aria-label="Color Secundario Lúcido"
              onChange={(e) => setLucidSecondaryColor(e.target.value)}
              className="w-4 h-4 rounded-pill cursor-pointer border-0 p-0 bg-transparent overflow-hidden"
            />
          </div>
        </div>
      )}

      {/* Floating 10-Color Neon Palette Modal */}
      {isPaletteOpen && (
        <div
          className="absolute top-full mt-2.5 right-0 z-50 w-72 max-w-[calc(100vw-2rem)] bg-surface-overlay material-thick border border-border-medium rounded-modal p-4 shadow-modal space-y-3 animate-aura-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-caption font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-accent-cyan" />
              10 Temas Lúcidos (Duotono)
            </span>
            <span className="text-caption text-text-tertiary font-mono">
              {LUCID_THEMES.findIndex((t) => t.id === lucidTheme.id) + 1}/10
            </span>
          </div>

          {/* Custom HEX Color Customizer */}
          <div className="p-2.5 rounded-card bg-surface-base/60 border border-border-subtle space-y-2">
            <span className="text-caption font-mono text-accent-cyan font-semibold uppercase tracking-wider block">
              Personalizador HEX
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-control bg-surface-dock border border-border-subtle min-h-11">
                <span className="text-caption font-mono text-text-secondary">Primario</span>
                <input
                  type="color"
                  value={lucidPrimaryColor}
                  aria-label="Color primario"
                  onChange={(e) => setLucidPrimaryColor(e.target.value)}
                  className="w-6 h-6 rounded-pill cursor-pointer border-0 p-0 bg-transparent"
                />
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-control bg-surface-dock border border-border-subtle min-h-11">
                <span className="text-caption font-mono text-text-secondary">Secundario</span>
                <input
                  type="color"
                  value={lucidSecondaryColor}
                  aria-label="Color secundario"
                  onChange={(e) => setLucidSecondaryColor(e.target.value)}
                  className="w-6 h-6 rounded-pill cursor-pointer border-0 p-0 bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
            {LUCID_THEMES.map((theme) => {
              const isSelected = isLucid && lucidTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLucidTheme(theme);
                    setIsPaletteOpen(false);
                  }}
                  className={`min-h-11 flex items-center gap-2 p-2 rounded-control text-left text-caption transition-all btn-spring cursor-pointer ${
                    isSelected
                      ? 'bg-white/20 border border-border-highlight text-text-primary font-medium shadow-subtle'
                      : 'hover:bg-white/10 text-text-secondary hover:text-text-primary border border-transparent'
                  }`}
                >
                  <div
                    className="flex items-center -space-x-1.5 flex-shrink-0"
                    title={`${theme.name} (${theme.primary} & ${theme.secondary})`}
                  >
                    <span
                      className="w-4 h-4 rounded-pill border border-black/50 shadow-subtle"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span
                      className="w-4 h-4 rounded-pill border border-black/50 shadow-subtle"
                      style={{ backgroundColor: theme.secondary }}
                    />
                  </div>
                  <span className="text-caption truncate font-medium">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LucidToggle;
