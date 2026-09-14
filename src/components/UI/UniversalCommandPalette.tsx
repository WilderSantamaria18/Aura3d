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
  Maximize,
  Minimize,
  Waves,
  X,
  Keyboard,
  Compass,
  Gauge,
  Disc3,
  Bookmark,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Mic,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { AudioEngine } from '../../services/audioEngine';
import { pictureInPictureService } from '../../services/pictureInPictureService';
import { soundscapeEngine } from '../../services/soundscapeEngine';

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
    binauralMode,
    setBinauralMode,
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
    toggleShuffle,
    isShuffled,
    repeatMode,
    setRepeatMode,
    isMuted,
    volume,
    setVolume,
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
      id: 'viz_blackhole',
      title: 'Visualizador: Agujero Negro Cuántico (Singularidad)',
      category: 'Visualizadores',
      icon: Disc3,
      action: () => setVisualizerMode('blackhole'),
      badge: visualizerMode === 'blackhole' ? 'Activo' : '',
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

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#080b16]/95 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col font-mono text-xs z-10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar herramienta, efecto DSP, visualizador o comando... (Esc para salir)"
            className="flex-1 bg-transparent text-white/90 placeholder-white/40 focus:outline-none text-xs font-mono"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/50 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Command Items List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-xs">
              No se encontraron comandos para "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon as React.ComponentType<{ className?: string }>;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 text-white border border-cyan-500/30'
                      : 'text-white/70 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/50'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-xs font-medium text-white/90">{item.title}</span>
                      <span className="text-[9px] text-white/40 uppercase tracking-wider">{item.category}</span>
                    </div>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 border border-cyan-500/20 flex-shrink-0 ml-2">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/40">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>↵ para ejecutar</span>
          </div>
          <span>Aura3D Universal Palette</span>
        </div>
      </div>
    </div>
  );
};
