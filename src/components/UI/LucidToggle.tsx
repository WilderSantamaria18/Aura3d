import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { LUCID_THEMES } from '../../types/audio';
import { Sparkles, Palette, ChevronDown } from 'lucide-react';

export const LucidToggle: React.FC = () => {
  const { isLucid, toggleLucidMode, lucidTheme, setLucidTheme } = usePlayerStore();
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
    <div className="relative inline-flex items-center" ref={paletteRef}>
      {/* Main Lucid Mode Button */}
      <div
        className={`inline-flex items-center rounded-full border text-xs font-medium tracking-wide transition-all duration-300 p-0.5 ${
          isLucid
            ? 'backdrop-blur-xl border-white/20'
            : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
        }`}
        style={
          isLucid
            ? {
                backgroundColor: `${lucidTheme.primary}18`,
                borderColor: `${lucidTheme.primary}60`,
                boxShadow: `0 0 20px ${lucidTheme.glow}`,
                color: '#ffffff',
              }
            : undefined
        }
      >
        <button
          onClick={toggleLucidMode}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full transition-transform active:scale-95 text-[11px] sm:text-xs"
          title={isLucid ? 'Desactivar Modo Lúcido' : 'Activar Modo Lúcido (10 Colores Neón)'}
        >
          {isLucid ? (
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: lucidTheme.primary }}
            />
          ) : (
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
          <span className="hidden min-[400px]:inline">{isLucid ? lucidTheme.name.split(' ')[0] : 'Lúcido'}</span>
        </button>

        {/* Color Palette Dropdown Trigger (when active) */}
        {isLucid && (
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="p-1 rounded-full hover:bg-white/15 transition-all text-white/80 hover:text-white mr-0.5 sm:mr-1"
            title="Elegir entre 10 Paletas de Color Lúcidas"
          >
            <div
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-white/40 shadow-sm flex items-center justify-center"
              style={{ backgroundColor: lucidTheme.primary }}
            >
              <ChevronDown className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-black stroke-[3]" />
            </div>
          </button>
        )}
      </div>

      {/* Floating 10-Color Neon Palette Modal */}
      {isPaletteOpen && (
        <div className="absolute top-11 right-0 z-50 w-60 sm:w-64 max-w-[calc(100vw-1.5rem)] bg-[#080b18]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-3.5 shadow-2xl shadow-black/90 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-[11px] font-semibold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              10 Colores Lúcidos
            </span>
            <span className="text-[10px] text-white/50 font-mono">
              {LUCID_THEMES.findIndex((t) => t.id === lucidTheme.id) + 1}/10
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {LUCID_THEMES.map((theme) => {
              const isSelected = lucidTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setLucidTheme(theme);
                    setIsPaletteOpen(false);
                  }}
                  className={`flex items-center gap-2 p-1.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-white/15 border border-white/30 text-white font-medium shadow-md'
                      : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-white/30 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                      boxShadow: isSelected ? `0 0 10px ${theme.primary}` : 'none',
                    }}
                  />
                  <span className="text-[10px] truncate">{theme.name}</span>
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
