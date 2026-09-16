import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Headphones,
  Sliders,
  Radio,
  Tv,
  Clock,
  Sparkles,
  Zap,
  Grid,
  Mountain,
  Music,
  Waves,
  Bookmark,
  Disc3,
  Gauge,
  Mic,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';
import { pictureInPictureService } from '../../services/pictureInPictureService';
import { soundscapeEngine } from '../../services/soundscapeEngine';
import { EmptyState } from '../Common/EmptyState';

interface CommandItem {
  id: string;
  title: string;
  category: 'DSP & Audio' | 'Herramientas' | 'Visualizadores' | 'Ambientes Lo-Fi' | 'Control';
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
  badge?: string;
}

export const UniversalCommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    is8DAudioActive,
    toggle8DAudio,
    isUnderwaterActive,
    toggleUnderwater,
    dspSpeedMode,
    setDspSpeedMode,
    masteringPreset,
    setMasteringPreset,
    isRetroCrtActive,
    toggleRetroCrt,
    showAudioRibbons,
    toggleAudioRibbons,
    visualizerMode,
    setVisualizerMode,
    setEqualizerOpen,
    setSidebarOpen,
    setSessionStatsOpen,
    setLoopPointA,
    setLoopPointB,
    clearLoop,
    isLoopActive,
    toggleHarmonicSync,
    isHarmonicSyncActive,
    toggleInfiniteRadio,
    isInfiniteRadioActive,
    vocalMode,
    setVocalMode,
    setStoryCardOpen,
  } = usePlayerStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const commands: CommandItem[] = useMemo(() => [
    // DSP & Audio
    {
      id: 'dsp_underwater',
      title: 'Modo Club Sumergido (Filtro Low-Pass 450Hz)',
      category: 'DSP & Audio',
      icon: Waves,
      action: () => toggleUnderwater(),
      badge: isUnderwaterActive ? 'Activo' : 'Inactivo',
    },
    {
      id: 'dsp_8d',
      title: 'Audio Espacial 8D Orbital',
      category: 'DSP & Audio',
      icon: Radio,
      action: () => toggle8DAudio(),
      badge: is8DAudioActive ? 'Activo' : 'Inactivo',
    },
    {
      id: 'dsp_karaoke',
      title: 'Modo Karaoke / Pista Instrumental (Atenuar voz central)',
      category: 'DSP & Audio',
      icon: Mic,
      action: () => setVocalMode(vocalMode === 'karaoke' ? 'off' : 'karaoke'),
      badge: vocalMode === 'karaoke' ? 'Activo' : '',
    },
    {
      id: 'dsp_acappella',
      title: 'Modo A Capela (Aislar voz humana)',
      category: 'DSP & Audio',
      icon: Mic,
      action: () => setVocalMode(vocalMode === 'acappella' ? 'off' : 'acappella'),
      badge: vocalMode === 'acappella' ? 'Activo' : '',
    },
    {
      id: 'dsp_slowed',
      title: 'Velocidad Slowed + Cavern Reverb (0.85x)',
      category: 'DSP & Audio',
      icon: Headphones,
      action: () => setDspSpeedMode(dspSpeedMode === 'slowed' ? 'normal' : 'slowed'),
      badge: dspSpeedMode === 'slowed' ? 'Activo' : '',
    },
    {
      id: 'dsp_nightcore',
      title: 'Velocidad Nightcore / Fast Up-tempo (1.20x)',
      category: 'DSP & Audio',
      icon: Zap,
      action: () => setDspSpeedMode(dspSpeedMode === 'nightcore' ? 'normal' : 'nightcore'),
      badge: dspSpeedMode === 'nightcore' ? 'Activo' : '',
    },
    {
      id: 'dsp_mastering_club',
      title: 'Mastering Limiter: Punchy Club',
      category: 'DSP & Audio',
      icon: Gauge,
      action: () => setMasteringPreset('punchy_club'),
      badge: masteringPreset === 'punchy_club' ? 'Activo' : '',
    },
    {
      id: 'dsp_mastering_tape',
      title: 'Mastering Limiter: Warm Tape Glue',
      category: 'DSP & Audio',
      icon: Gauge,
      action: () => setMasteringPreset('warm_tape'),
      badge: masteringPreset === 'warm_tape' ? 'Activo' : '',
    },
    {
      id: 'dsp_harmonic_sync',
      title: 'Mezcla Armónica DJ Automática (BPM & Camelot Beat-Sync)',
      category: 'DSP & Audio',
      icon: Disc3,
      action: () => toggleHarmonicSync(),
      badge: isHarmonicSyncActive ? 'Activo' : 'Inactivo',
    },
    {
      id: 'dj_loop_a',
      title: 'DJ Looper: Fijar Punto de Inicio [A]',
      category: 'Control',
      icon: Bookmark,
      action: () => setLoopPointA(),
    },
    {
      id: 'dj_loop_b',
      title: 'DJ Looper: Fijar Punto de Fin [B] y Activar Bucle',
      category: 'Control',
      icon: Bookmark,
      action: () => setLoopPointB(),
    },
    {
      id: 'dj_loop_clear',
      title: 'DJ Looper: Limpiar / Salir del Bucle A-B',
      category: 'Control',
      icon: Bookmark,
      action: () => clearLoop(),
      badge: isLoopActive ? 'Bucle Activo' : '',
    },
    {
      id: 'dj_tape_stop',
      title: 'Freno de Vinilo Analógico (Tape Stop)',
      category: 'Control',
      icon: Disc3,
      action: () => AudioEngine.getInstance().triggerTapeStop(0.85),
    },
    {
      id: 'dj_scratch',
      title: 'Scratch Táctil DJ en Vivo',
      category: 'Control',
      icon: Disc3,
      action: () => AudioEngine.getInstance().triggerDjScratch(),
    },

    // Herramientas & Paneles
    {
      id: 'tool_eq',
      title: 'Abrir Ecualizador Paramétrico FabFilter Pro-Q',
      category: 'Herramientas',
      icon: Sliders,
      action: () => setEqualizerOpen(true),
    },
    {
      id: 'tool_stats',
      title: 'Ver Estadísticas de Escucha & Concentración',
      category: 'Herramientas',
      icon: Clock,
      action: () => setSessionStatsOpen(true),
    },
    {
      id: 'tool_pip',
      title: 'Ventana Flotante Picture-in-Picture (PiP)',
      category: 'Herramientas',
      icon: Tv,
      action: () => pictureInPictureService.togglePictureInPicture(),
    },
    {
      id: 'tool_library',
      title: 'Abrir Biblioteca Musical & Playlists',
      category: 'Herramientas',
      icon: Music,
      action: () => setSidebarOpen(true),
    },
    {
      id: 'tool_story_card',
      title: 'Crear Tarjeta Estética para Historias 9:16 (Instagram / TikTok)',
      category: 'Herramientas',
      icon: Sparkles,
      action: () => setStoryCardOpen(true),
    },
    {
      id: 'tool_infinite_radio',
      title: 'Radio Infinita / Smart Flow (Autoplay Armónico)',
      category: 'Herramientas',
      icon: Radio,
      action: () => toggleInfiniteRadio(),
      badge: isInfiniteRadioActive ? 'Activo' : 'Inactivo',
    },

    // Ambientes Lo-Fi
    {
      id: 'amb_rain',
      title: 'Alternar Lluvia Suave en Ventana',
      category: 'Ambientes Lo-Fi',
      icon: Waves,
      action: () => soundscapeEngine.toggleChannel('rain'),
    },
    {
      id: 'amb_fire',
      title: 'Alternar Crepitar de Fogata Analógica',
      category: 'Ambientes Lo-Fi',
      icon: Waves,
      action: () => soundscapeEngine.toggleChannel('fire'),
    },
    {
      id: 'amb_cafe',
      title: 'Alternar Cafetería Nocturna',
      category: 'Ambientes Lo-Fi',
      icon: Waves,
      action: () => soundscapeEngine.toggleChannel('cafe'),
    },
    {
      id: 'amb_ocean',
      title: 'Alternar Olas del Mar Nocturnas',
      category: 'Ambientes Lo-Fi',
      icon: Waves,
      action: () => soundscapeEngine.toggleChannel('ocean'),
    },

    // Visualizadores
    {
      id: 'viz_blob',
      title: 'Visualizador: Rainbow Void (2D Shaders)',
      category: 'Visualizadores',
      icon: Sparkles,
      action: () => setVisualizerMode('blob'),
      badge: visualizerMode === 'blob' ? 'Activo' : '',
    },
    {
      id: 'viz_synthwave',
      title: 'Visualizador: Synthwave 3D (Carretera Neón)',
      category: 'Visualizadores',
      icon: Grid,
      action: () => setVisualizerMode('synthwave'),
      badge: visualizerMode === 'synthwave' ? 'Activo' : '',
    },
    {
      id: 'viz_warp',
      title: 'Visualizador: Túnel Warp Hipersónico',
      category: 'Visualizadores',
      icon: Zap,
      action: () => setVisualizerMode('warp'),
      badge: visualizerMode === 'warp' ? 'Activo' : '',
    },
    {
      id: 'viz_terrain',
      title: 'Visualizador: Terreno 3D Cyberpunk',
      category: 'Visualizadores',
      icon: Mountain,
      action: () => setVisualizerMode('terrain'),
      badge: visualizerMode === 'terrain' ? 'Activo' : '',
    },
    {
      id: 'filter_crt',
      title: 'Filtro Analógico: Scanlines CRT & Grano de Película',
      category: 'Visualizadores',
      icon: Tv,
      action: () => toggleRetroCrt(),
      badge: isRetroCrtActive ? 'Activo' : '',
    },
    {
      id: 'filter_ribbons',
      title: 'Cintas de Luz Fluidas (Audio Ribbons)',
      category: 'Visualizadores',
      icon: Sparkles,
      action: () => toggleAudioRibbons(),
      badge: showAudioRibbons ? 'Activo' : '',
    },
  ], [
    isUnderwaterActive,
    is8DAudioActive,
    dspSpeedMode,
    masteringPreset,
    isHarmonicSyncActive,
    isLoopActive,
    isInfiniteRadioActive,
    visualizerMode,
    isRetroCrtActive,
    showAudioRibbons,
    vocalMode,
    toggleUnderwater,
    toggle8DAudio,
    setDspSpeedMode,
    setMasteringPreset,
    toggleHarmonicSync,
    setLoopPointA,
    setLoopPointB,
    clearLoop,
    setEqualizerOpen,
    setSessionStatsOpen,
    setSidebarOpen,
    toggleInfiniteRadio,
    setVisualizerMode,
    toggleRetroCrt,
    toggleAudioRibbons,
    setVocalMode,
    setStoryCardOpen,
  ]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  useEffect(() => {
    if (listRef.current && filtered[selectedIndex]) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filtered]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-4 bg-surface-scrim material-regular animate-in fade-in duration-200"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Paleta universal de comandos Aura3D"
    >
      <div
        className="w-full max-w-xl rounded-modal bg-surface-overlay material-thick border border-border-subtle shadow-[var(--shadow-modal)] overflow-hidden flex flex-col font-mono text-caption z-10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-surface-subtle">
          <Search className="w-4 h-4 text-ios-teal flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls="command-palette-list"
            aria-autocomplete="list"
            aria-activedescendant={filtered[selectedIndex] ? `cmd-item-${filtered[selectedIndex].id}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar herramienta, efecto DSP, visualizador o comando... (Esc para salir)"
            className="flex-1 min-h-11 bg-transparent text-text-primary placeholder-text-tertiary focus:outline-none text-caption font-mono"
            aria-label="Buscar comando o herramienta"
          />
          <kbd className="px-2 py-0.5 rounded-badge bg-surface-subtle text-caption text-text-secondary border border-border-subtle font-bold">
            ESC
          </kbd>
        </div>

        {/* Command Items List */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Comandos disponibles"
          className="max-h-[380px] overflow-y-auto scrollbar-thin p-2 flex flex-col gap-1"
        >
          {filtered.length === 0 ? (
            <div className="py-4">
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description={`No se encontraron herramientas o comandos que coincidan con "${query}".`}
              />
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon as React.ComponentType<{ className?: string }>;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  id={`cmd-item-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    item.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full min-h-11 flex items-center justify-between p-2.5 rounded-control text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-active text-text-primary border border-ios-teal/40 shadow-sm'
                      : 'text-text-secondary hover:bg-surface-subtle border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-control transition-colors flex-shrink-0 ${
                        isSelected ? 'bg-ios-teal/20 text-ios-teal' : 'bg-surface-subtle text-text-tertiary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-caption font-medium text-text-primary">{item.title}</span>
                      <span className="text-caption text-text-tertiary uppercase tracking-wider font-mono">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span className="text-caption font-bold px-2 py-0.5 rounded-pill bg-ios-teal/20 text-ios-teal border border-ios-teal/30 flex-shrink-0 ml-2 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-subtle text-caption text-text-tertiary font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-subtle text-text-secondary rounded-badge border border-border-subtle">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-surface-subtle text-text-secondary rounded-badge border border-border-subtle">↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-subtle text-text-secondary rounded-badge border border-border-subtle">↵</kbd> ejecutar
            </span>
          </div>
          <span className="tracking-wider uppercase text-caption text-text-tertiary font-medium">
            Aura3D Spotlight
          </span>
        </div>
      </div>
    </div>
  );
};

export default UniversalCommandPalette;
