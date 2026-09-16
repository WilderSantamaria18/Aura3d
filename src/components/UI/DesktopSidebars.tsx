import React, { useState } from 'react';
import {
  ListMusic,
  Heart,
  Radio,
  Sparkles,
  Music,
  Play,
  Pause,
  Sliders,
  Volume2,
  FolderPlus,
  Plus,
  Trash2,
  SlidersHorizontal,
  Layers,
  Activity,
  Zap,
  Grid,
  Mountain,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { RADIO_STATIONS } from '../../config/radioStations';
import { MiniSpectrumBars } from './MiniSpectrumBars';

const VISUALIZERS = [
  { id: 'blob', name: 'Rainbow Void', icon: Sparkles, desc: 'Núcleo 2D Shaders' },
  { id: 'synthwave', name: 'Synthwave 3D', icon: Grid, desc: 'Carretera neón retro' },
  { id: 'warp', name: 'Túnel Warp', icon: Zap, desc: 'Túnel hipersónico 3D' },
  { id: 'terrain', name: 'Terreno 3D', icon: Mountain, desc: 'Ondas Cyberpunk' },
] as const;

export const DesktopLeftSidebar: React.FC = () => {
  const {
    queue,
    favorites,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    removeFromQueue,
    createPlaylist,
  } = usePlayerStore();

  const { loadFile, playRadioStation, togglePlayPause } = useAudioEngine();
  const [activeTab, setActiveTab] = useState<'queue' | 'favorites' | 'playlists' | 'radio'>('queue');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreatingPlaylist(false);
    }
  };

  const handleLocalFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        loadFile(file);
      });
    }
  };

  return (
    <aside
      aria-label="Biblioteca y Listas de Reproducción"
      className="fixed left-0 top-0 bottom-0 z-30 hidden lg:flex flex-col w-[300px] bg-surface-overlay material-thick border-r border-border-subtle shadow-[20px_0_60px_rgba(0,0,0,0.4)] select-none pointer-events-auto"
    >
      {/* Header Brand & Navigation Tabs */}
      <div className="p-4 border-b border-border-subtle flex flex-col gap-3 bg-surface-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center text-ios-teal shadow-subtle">
              <ListMusic className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-subheadline font-semibold text-text-primary leading-tight">Biblioteca</h2>
              <p className="text-caption text-text-tertiary font-mono">Aura3D Studio DAW</p>
            </div>
          </div>

          <label
            className="min-h-11 min-w-11 px-3 py-1.5 rounded-control bg-accent-teal/15 hover:bg-accent-teal/25 border border-accent-teal/30 text-accent-teal text-caption font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Importar archivos de audio locales"
            aria-label="Importar archivos de audio locales"
          >
            <FolderPlus className="w-4 h-4" aria-hidden="true" />
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a"
              multiple
              onChange={handleLocalFilePick}
              className="hidden"
              aria-label="Cargar pistas de audio locales"
            />
          </label>
        </div>

        {/* 4 Tabs with 44px min touch target */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-surface-base/80 rounded-control border border-border-subtle">
          {[
            { id: 'queue', label: 'Cola', icon: ListMusic, count: queue.length },
            { id: 'favorites', label: 'Favoritos', icon: Heart, count: favorites.length },
            { id: 'playlists', label: 'Listas', icon: Music, count: playlists.length },
            { id: 'radio', label: 'Radio', icon: Radio, count: RADIO_STATIONS.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-11 py-1.5 px-1 rounded-control text-caption font-mono font-medium transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer btn-spring ${
                activeTab === tab.id
                  ? 'bg-accent-teal text-text-primary font-bold shadow-subtle'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
              }`}
              title={tab.label}
              aria-label={`${tab.label} (${tab.count})`}
            >
              <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="text-caption truncate leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {activeTab === 'queue' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1 py-1 text-caption font-mono text-text-tertiary uppercase">
              <span>Pistas en Cola ({queue.length})</span>
            </div>
            {queue.length === 0 ? (
              <div className="p-6 text-center text-caption text-text-muted">
                No hay pistas en la cola. Arrastra archivos de audio o selecciona de la radio.
              </div>
            ) : (
              queue.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id || idx}
                    className={`flex items-center justify-between p-2 min-h-11 rounded-control transition-all group ${
                      isCurrent
                        ? 'bg-accent-teal/15 border border-accent-teal/30 text-text-primary'
                        : 'bg-surface-base/40 border border-transparent hover:border-border-subtle hover:bg-surface-base/80 text-text-secondary'
                    }`}
                  >
                    <button
                      onClick={() => playTrack(track)}
                      className="flex-1 flex items-center gap-2 text-left min-w-0 min-h-11 cursor-pointer"
                      aria-label={`Reproducir ${track.title} de ${track.artist}`}
                    >
                      <div className="w-7 h-7 rounded-control bg-surface-subtle flex items-center justify-center flex-shrink-0 text-text-tertiary group-hover:text-accent-teal">
                        {isCurrent && isPlaying ? (
                          <MiniSpectrumBars />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-caption font-medium truncate text-text-primary leading-tight">
                          {track.title}
                        </div>
                        <div className="text-caption text-text-tertiary font-mono truncate leading-tight">
                          {track.artist}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => removeFromQueue(idx)}
                      className="min-h-11 min-w-11 p-2 rounded-control text-text-tertiary hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      title="Eliminar de la cola"
                      aria-label={`Eliminar ${track.title} de la cola`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-1">
            <div className="px-1 py-1 text-caption font-mono text-text-tertiary uppercase">
              Favoritos ({favorites.length})
            </div>
            {favorites.length === 0 ? (
              <div className="p-6 text-center text-caption text-text-muted">
                No tienes favoritos marcados aún.
              </div>
            ) : (
              favorites.map((track, idx) => (
                <div
                  key={track.id || idx}
                  className="flex items-center justify-between p-2 min-h-11 rounded-control bg-surface-base/40 border border-border-subtle hover:bg-surface-base/80 text-text-secondary transition-all"
                >
                  <button
                    onClick={() => playTrack(track)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0 min-h-11 cursor-pointer"
                    aria-label={`Reproducir ${track.title}`}
                  >
                    <Heart className="w-4 h-4 text-accent-rose fill-accent-rose flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-medium truncate text-text-primary leading-tight">{track.title}</div>
                      <div className="text-caption text-text-tertiary font-mono truncate leading-tight">{track.artist}</div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-caption font-mono text-text-tertiary uppercase">Playlists ({playlists.length})</span>
              <button
                onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)}
                className="min-h-11 px-2.5 py-1 rounded-control text-caption font-semibold bg-accent-teal/15 text-accent-teal hover:bg-accent-teal/25 border border-accent-teal/30 flex items-center gap-1 cursor-pointer"
                aria-label="Nueva Playlist"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva</span>
              </button>
            </div>

            {isCreatingPlaylist && (
              <form onSubmit={handleCreatePlaylist} className="p-2 rounded-card bg-surface-base/80 border border-border-subtle flex gap-1.5">
                <input
                  type="text"
                  placeholder="Nombre de lista..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="flex-1 min-h-11 px-2.5 rounded-control bg-surface-subtle border border-border-subtle text-caption text-text-primary outline-none focus:border-accent-teal"
                  aria-label="Nombre de nueva playlist"
                  autoFocus
                />
                <button
                  type="submit"
                  className="min-h-11 px-3 rounded-control bg-accent-teal text-text-primary text-caption font-semibold cursor-pointer"
                  aria-label="Guardar playlist"
                >
                  Crear
                </button>
              </form>
            )}

            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="p-2.5 min-h-11 rounded-control bg-surface-base/40 border border-border-subtle hover:bg-surface-base/80 transition-all flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-caption font-medium text-text-primary truncate">{pl.name}</div>
                  <div className="text-caption text-text-tertiary font-mono">{pl.tracks.length} canciones</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'radio' && (
          <div className="space-y-1">
            <div className="px-1 py-1 text-caption font-mono text-text-tertiary uppercase">
              Emisoras Cyberpunk & Lo-Fi
            </div>
            {RADIO_STATIONS.map((st) => (
              <button
                key={st.id}
                onClick={() => playRadioStation(st)}
                className="w-full flex items-center gap-2.5 p-2 min-h-11 rounded-control bg-surface-base/40 border border-border-subtle hover:border-accent-teal/40 hover:bg-surface-base/80 text-left transition-all cursor-pointer btn-spring"
                aria-label={`Sintonizar ${st.name} ${st.genre}`}
              >
                <div className="w-8 h-8 rounded-control bg-surface-subtle flex items-center justify-center flex-shrink-0 text-accent-cyan">
                  <Radio className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-caption font-medium text-text-primary truncate">{st.name}</div>
                  <div className="text-caption text-text-tertiary font-mono truncate">{st.genre} • {st.bitrate || 'Live'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-border-subtle bg-surface-subtle flex items-center justify-between text-caption font-mono text-text-tertiary">
        <span>Audio 32-bit DSP</span>
        <span className="text-accent-teal">48 kHz Activo</span>
      </div>
    </aside>
  );
};

export const DesktopRightSidebar: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const visualizerMode = usePlayerStore((s) => s.visualizerMode);
  const setVisualizerMode = usePlayerStore((s) => s.setVisualizerMode);
  const setLyricsOpen = usePlayerStore((s) => s.setLyricsOpen);
  const setEqualizerOpen = usePlayerStore((s) => s.setEqualizerOpen);
  const { togglePlayPause } = useAudioEngine();

  return (
    <aside
      aria-label="Panel de Control y Parámetros del Motor 3D"
      className="fixed right-0 top-0 bottom-0 z-30 hidden lg:flex flex-col w-[340px] bg-surface-overlay material-thick border-l border-border-subtle shadow-[-20px_0_60px_rgba(0,0,0,0.4)] select-none pointer-events-auto"
    >
      {/* Header */}
      <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center text-accent-teal shadow-subtle">
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-subheadline font-semibold text-text-primary leading-tight">Master & Escena</h2>
            <p className="text-caption text-text-tertiary font-mono">Shader Engine 3D</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setEqualizerOpen(true)}
            className="min-h-11 min-w-11 px-2.5 py-1 rounded-control bg-surface-base/80 hover:bg-surface-base border border-border-subtle text-text-secondary hover:text-text-primary text-caption font-mono flex items-center justify-center gap-1 cursor-pointer transition-all"
            title="Abrir Ecualizador Multibanda"
            aria-label="Abrir Ecualizador Multibanda"
          >
            <Sliders className="w-4 h-4 text-accent-cyan" />
            <span className="hidden xl:inline">EQ</span>
          </button>
          <button
            onClick={() => setLyricsOpen(true)}
            className="min-h-11 min-w-11 px-2.5 py-1 rounded-control bg-surface-base/80 hover:bg-surface-base border border-border-subtle text-text-secondary hover:text-text-primary text-caption font-mono flex items-center justify-center gap-1 cursor-pointer transition-all"
            title="Abrir Panel de Letras Sincronizadas"
            aria-label="Abrir Panel de Letras"
          >
            <Layers className="w-4 h-4 text-accent-rose" />
            <span className="hidden xl:inline">Letras</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Track Now Playing Card */}
        <div className="p-3.5 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-caption font-mono text-accent-teal uppercase tracking-wider font-semibold">
              En Reproducción
            </span>
            <span className="text-caption font-mono text-text-tertiary">
              {isPlaying ? 'LIVE 3D' : 'PAUSADO'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center flex-shrink-0 text-accent-teal shadow-inner">
              <Music className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-body font-semibold text-text-primary truncate leading-tight">
                {currentTrack?.title || 'Auralis Studio'}
              </h3>
              <p className="text-caption text-text-tertiary font-mono truncate mt-0.5">
                {currentTrack?.artist || 'DAW Spatial Engine'}
              </p>
            </div>
          </div>
        </div>

        {/* 3D Visualizer Selectors */}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-mono text-text-tertiary uppercase tracking-wider px-1">
            Motor Visualizador 3D
          </span>
          <div className="grid grid-cols-2 gap-2">
            {VISUALIZERS.map((v) => {
              const isSelected = visualizerMode === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVisualizerMode(v.id as any)}
                  className={`p-2.5 min-h-11 rounded-control text-left transition-all border flex flex-col justify-between cursor-pointer btn-spring ${
                    isSelected
                      ? 'bg-accent-teal/20 text-text-primary border-accent-teal/50 font-bold shadow-subtle'
                      : 'bg-surface-base/40 border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-base/80'
                  }`}
                  aria-label={`Seleccionar visualizador ${v.name}`}
                >
                  <div className="flex items-center gap-2">
                    <v.icon className="w-4 h-4 text-accent-teal flex-shrink-0" />
                    <span className="text-caption font-semibold truncate">{v.name}</span>
                  </div>
                  <span className="text-caption text-text-tertiary font-sans truncate mt-1">{v.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Hardware & Telemetry Metrics */}
        <div className="p-3.5 rounded-card bg-surface-base/60 border border-border-subtle flex flex-col gap-2">
          <span className="text-caption font-mono text-text-tertiary uppercase tracking-wider">
            Telemetría de Audio
          </span>
          <div className="grid grid-cols-2 gap-2 text-caption font-mono">
            <div className="p-2 rounded-control bg-surface-subtle border border-border-subtle flex flex-col">
              <span className="text-text-tertiary">Latencia DSP</span>
              <span className="text-status-success font-bold text-subheadline leading-tight mt-0.5">5.2 ms</span>
            </div>
            <div className="p-2 rounded-control bg-surface-subtle border border-border-subtle flex flex-col">
              <span className="text-text-tertiary">Resolución FFT</span>
              <span className="text-accent-teal font-bold text-subheadline leading-tight mt-0.5">2048 pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Playback CTA */}
      <div className="p-3 border-t border-border-subtle bg-surface-subtle">
        <button
          onClick={togglePlayPause}
          className="w-full min-h-11 py-2 px-4 rounded-control bg-accent-teal hover:bg-accent-teal/90 text-text-primary font-semibold text-caption flex items-center justify-center gap-2 cursor-pointer shadow-subtle btn-spring active:scale-98"
          aria-label={isPlaying ? 'Pausar reproducción' : 'Iniciar reproducción'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
          <span>{isPlaying ? 'Pausar Reproducción' : 'Iniciar Reproducción'}</span>
        </button>
      </div>
    </aside>
  );
};
