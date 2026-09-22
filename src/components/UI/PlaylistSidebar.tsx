import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Music,
  Heart,
  ListMusic,
  Plus,
  Upload,
  FolderPlus,
  Radio,
  Sparkles,
  Play,
  Volume2,
  Eraser,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useDebounce } from '../../hooks/useDebounce';
import { useLiquidGlassScrollbar } from '../../hooks/useLiquidGlassScrollbar';
import { RADIO_STATIONS } from '../../config/radioStations';
import { PresetService } from '../../services/presetService';
import { EmptyState } from '../Common/EmptyState';
import { SearchBar } from './SearchBar';
import { SegmentedTabs } from './SegmentedTabs';
import type { TabItem } from './SegmentedTabs';
import { TrackItem } from './TrackItem';
import type { Track } from '../../types/audio';

type SidebarTab = 'queue' | 'favorites' | 'playlists' | 'radio';

function formatTotalDuration(tracks: Track[]): string {
  const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  if (totalSecs <= 0) return '0 MIN';
  const mins = Math.round(totalSecs / 60);
  return `${mins} MIN`;
}

export const PlaylistSidebar: React.FC = () => {
  const {
    isSidebarOpen,
    setSidebarOpen,
    queue,
    favorites,
    playlists,
    currentTrack,
    isPlaying,
    playTrack,
    playNext,
    clearQueue,
    removeFromQueue,
    toggleFavorite,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
  } = usePlayerStore();

  const { loadFile, playRadioStation } = useAudioEngine();

  const [activeTab, setActiveTab] = useState<SidebarTab>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 150);

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useLiquidGlassScrollbar(scrollContainerRef);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen, setSidebarOpen]);

  // Clean confirm timer on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const handleClearQueueClick = () => {
    if (isConfirmingClear) {
      clearQueue();
      setIsConfirmingClear(false);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    } else {
      setIsConfirmingClear(true);
      clearTimerRef.current = setTimeout(() => {
        setIsConfirmingClear(false);
      }, 3500);
    }
  };

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

  // Drag and Drop Handling
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
          loadFile(file);
        }
      });
    }
  };

  // Tab Definitions
  const tabs: TabItem<SidebarTab>[] = [
    { id: 'queue', label: 'Cola', count: queue.length, icon: <Music className="w-3 h-3" /> },
    { id: 'favorites', label: 'Favoritos', count: favorites.length, icon: <Heart className="w-3 h-3" /> },
    { id: 'playlists', label: 'Listas', count: playlists.length, icon: <ListMusic className="w-3 h-3" /> },
    { id: 'radio', label: 'Radio 24/7', icon: <Radio className="w-3 h-3" /> },
  ];

  // Search Filtering
  const filterQuery = debouncedSearch.trim().toLowerCase();

  const filteredQueue = useMemo(() => {
    if (!filterQuery) return queue;
    return queue.filter(
      (t) =>
        t.title.toLowerCase().includes(filterQuery) ||
        t.artist.toLowerCase().includes(filterQuery) ||
        (t.genre && t.genre.toLowerCase().includes(filterQuery))
    );
  }, [queue, filterQuery]);

  const filteredFavorites = useMemo(() => {
    if (!filterQuery) return favorites;
    return favorites.filter(
      (t) =>
        t.title.toLowerCase().includes(filterQuery) ||
        t.artist.toLowerCase().includes(filterQuery) ||
        (t.genre && t.genre.toLowerCase().includes(filterQuery))
    );
  }, [favorites, filterQuery]);

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  const filteredPlaylistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    if (!filterQuery) return activePlaylist.tracks;
    return activePlaylist.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(filterQuery) ||
        t.artist.toLowerCase().includes(filterQuery)
    );
  }, [activePlaylist, filterQuery]);

  const filteredRadio = useMemo(() => {
    if (!filterQuery) return RADIO_STATIONS;
    return RADIO_STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(filterQuery) ||
        s.genre.toLowerCase().includes(filterQuery) ||
        s.description.toLowerCase().includes(filterQuery)
    );
  }, [filterQuery]);

  // Current active track list for telemetry
  const currentTabTracks = useMemo(() => {
    if (activeTab === 'queue') return filteredQueue;
    if (activeTab === 'favorites') return filteredFavorites;
    if (activeTab === 'playlists' && activePlaylist) return filteredPlaylistTracks;
    return [];
  }, [activeTab, filteredQueue, filteredFavorites, activePlaylist, filteredPlaylistTracks]);

  const isFavTrack = (trackId: string) => favorites.some((f) => f.id === trackId);

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[59]"
            aria-hidden="true"
          />

          {/* Floating Suspended Liquid Glass Chassis */}
          <motion.aside
            initial={{ x: '-110%', opacity: 0, filter: 'blur(20px)' }}
            animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ x: '-110%', opacity: 0, filter: 'blur(20px)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 0.8 }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            role="dialog"
            aria-modal="true"
            aria-label="Biblioteca de Audio de Estudio"
            className="fixed left-4 top-4 bottom-4 w-[clamp(320px,92vw,440px)] liquid-glass-drawer z-[60] flex flex-col overflow-hidden select-none pointer-events-auto max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-16 max-sm:w-auto"
          >
            {/* Drag & Drop Visual Overlay Feedback */}
            {isDragging && (
              <div className="absolute inset-0 z-50 liquid-glass-drawer border-2 border-dashed border-cyan-400/70 flex items-center justify-center bg-cyan-400/[0.08] backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
                <div className="text-center p-6 rounded-3xl bg-black/50 border border-white/20 shadow-2xl">
                  <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-bounce" />
                  <p className="text-sm font-bold text-white tracking-tight">Suelta para importar a la estación</p>
                  <p className="text-xs text-white/50 mt-1 font-mono">FLAC · WAV · MP3 · AAC · M4A</p>
                </div>
              </div>
            )}

            {/* Header: Dynamic Island Style Studio Title */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.2)]">
                  <ListMusic className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                    Biblioteca de Estudio
                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
                      PRO
                    </span>
                  </h3>
                  <p className="text-[10px] font-mono text-white/50">Estación de trabajo y reproducción 3D</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Cerrar biblioteca"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* iOS Segmented Control Tabs */}
            <SegmentedTabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                if (tab !== 'playlists') setSelectedPlaylistId(null);
              }}
            />

            {/* Instant Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={
                activeTab === 'radio'
                  ? 'Buscar emisora en vivo...'
                  : activeTab === 'playlists'
                  ? 'Buscar en playlists...'
                  : 'Buscar por título o artista...'
              }
            />

            {/* Action Bar: Local Import Pill */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
              <label className="flex-1 min-h-[38px] flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-cyan-400/30 text-xs font-medium text-white/90 hover:text-white cursor-pointer transition-all active:scale-[0.98] shadow-sm">
                <Upload className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="truncate">Importar Audio Local</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
                  multiple
                  onChange={handleLocalFilePick}
                  className="hidden"
                />
              </label>

              {activeTab === 'queue' && queue.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearQueueClick}
                  className={`min-h-[38px] px-3 rounded-xl text-[11px] font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isConfirmingClear
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                      : 'bg-white/[0.04] text-white/50 hover:text-rose-400 border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                  title="Limpiar cola de reproducción"
                >
                  {isConfirmingClear ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-rose-400" />
                      <span>¿Confirmar?</span>
                    </>
                  ) : (
                    <>
                      <Eraser className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Limpiar</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Scrollable Track Content List */}
            <div
              ref={scrollContainerRef}
              id={`tabpanel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="flex-1 overflow-y-auto liquid-glass-scrollbar px-4 py-2 space-y-1.5"
            >
              {/* TAB 1: QUEUE */}
              {activeTab === 'queue' && (
                <div className="space-y-1.5">
                  {filteredQueue.length === 0 ? (
                    <EmptyState
                      icon={filterQuery ? Music : Upload}
                      title={filterQuery ? 'Sin coincidencias' : 'Cola de reproducción vacía'}
                      description={
                        filterQuery
                          ? `No encontramos pistas con "${filterQuery}".`
                          : 'Arrastra tus archivos de audio aquí o carga pistas desde tu biblioteca.'
                      }
                    />
                  ) : (
                    filteredQueue.map((track, idx) => {
                      const isTrackActive = currentTrack?.id === track.id;
                      return (
                        <TrackItem
                          key={`${track.id}_${idx}`}
                          track={track}
                          isActive={isTrackActive}
                          isPlaying={isPlaying && isTrackActive}
                          isFavorite={isFavTrack(track.id)}
                          onPlay={() => playTrack(track)}
                          onToggleFavorite={toggleFavorite}
                          onPlayNext={playNext}
                          onRemove={() => removeFromQueue(idx)}
                        />
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: FAVORITES */}
              {activeTab === 'favorites' && (
                <div className="space-y-1.5">
                  {filteredFavorites.length === 0 ? (
                    <EmptyState
                      icon={Heart}
                      title={filterQuery ? 'Sin coincidencias' : 'Sin favoritos guardados'}
                      description={
                        filterQuery
                          ? `No encontramos canciones favoritas con "${filterQuery}".`
                          : 'Haz clic en el icono de corazón en cualquier canción para guardarla aquí.'
                      }
                    />
                  ) : (
                    filteredFavorites.map((track) => {
                      const isTrackActive = currentTrack?.id === track.id;
                      return (
                        <TrackItem
                          key={track.id}
                          track={track}
                          isActive={isTrackActive}
                          isPlaying={isPlaying && isTrackActive}
                          isFavorite={true}
                          onPlay={() => playTrack(track)}
                          onToggleFavorite={toggleFavorite}
                          onPlayNext={playNext}
                        />
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: PLAYLISTS */}
              {activeTab === 'playlists' && (
                <div className="space-y-3">
                  {!selectedPlaylistId ? (
                    <>
                      <div className="flex items-center justify-between pb-1 pt-1">
                        <span className="text-xs text-white/50 font-mono uppercase tracking-wider">
                          Tus Listas ({playlists.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingPlaylist(true)}
                          className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Nueva Lista
                        </button>
                      </div>

                      {isCreatingPlaylist && (
                        <form onSubmit={handleCreatePlaylist} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nombre de la playlist..."
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-white text-black font-semibold rounded-xl text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            Crear
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingPlaylist(false)}
                            className="px-2 py-1.5 text-white/50 hover:text-white text-xs"
                          >
                            Cancelar
                          </button>
                        </form>
                      )}

                      {playlists.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                          <FolderPlus className="w-8 h-8 text-white/20 mx-auto" />
                          <p className="text-white/40 text-xs font-mono">Crea tu primera lista de reproducción</p>
                        </div>
                      ) : (
                        playlists.map((pl) => (
                          <div
                            key={pl.id}
                            onClick={() => setSelectedPlaylistId(pl.id)}
                            className="track-item-glass p-3 flex items-center justify-between cursor-pointer group transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/60 group-hover:text-cyan-300">
                                <ListMusic className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white tracking-tight">{pl.name}</p>
                                <p className="text-[10px] text-white/40 font-mono">
                                  {pl.tracks.length} {pl.tracks.length === 1 ? 'canción' : 'canciones'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-cyan-400/60 group-hover:text-cyan-300 transition-colors">
                              Abrir →
                            </span>
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPlaylistId(null)}
                          className="text-xs text-cyan-300 hover:text-cyan-200 font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> Volver a listas
                        </button>
                        <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                          {activePlaylist?.name}
                        </span>
                      </div>

                      {currentTrack && activePlaylist && (
                        <button
                          type="button"
                          onClick={() => addToPlaylist(activePlaylist.id, currentTrack)}
                          className="w-full py-2 bg-white/[0.03] hover:bg-white/[0.07] rounded-xl text-xs text-white/80 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-colors font-mono cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-cyan-400" /> Añadir pista actual ({currentTrack.title})
                        </button>
                      )}

                      {filteredPlaylistTracks.length === 0 ? (
                        <div className="text-center py-8 text-white/40 text-xs font-mono">
                          Esta playlist no tiene canciones aún
                        </div>
                      ) : (
                        filteredPlaylistTracks.map((track) => {
                          const isTrackActive = currentTrack?.id === track.id;
                          return (
                            <TrackItem
                              key={track.id}
                              track={track}
                              isActive={isTrackActive}
                              isPlaying={isPlaying && isTrackActive}
                              isFavorite={isFavTrack(track.id)}
                              onPlay={() => playTrack(track)}
                              onToggleFavorite={toggleFavorite}
                              onPlayNext={playNext}
                              onRemove={() => removeFromPlaylist(activePlaylist!.id, track.id)}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LIVE RADIO 24/7 */}
              {activeTab === 'radio' && (
                <div className="space-y-2.5 animate-in fade-in duration-200">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/25 to-black/60 border border-white/[0.08] shadow-inner">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold">
                        EMISORAS EN VIVO 24/7
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      Transmisiones de audio continuas procesadas por el motor cuántico de Aura3D.
                    </p>
                  </div>

                  {filteredRadio.map((station) => {
                    const isCurrentPlaying = currentTrack?.id === station.id && isPlaying;

                    return (
                      <div
                        key={station.id}
                        className={`track-item-glass p-3 flex flex-col gap-2.5 ${
                          isCurrentPlaying ? 'is-active' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 flex-shrink-0"
                              style={{
                                backgroundColor: `${station.accentColor}22`,
                                color: station.accentColor,
                              }}
                            >
                              <Radio className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-white tracking-tight truncate">
                                {station.name}
                              </h4>
                              <span className="text-[10px] font-mono text-white/50">{station.genre}</span>
                            </div>
                          </div>

                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 border border-white/10 flex-shrink-0">
                            {station.bitrate}
                          </span>
                        </div>

                        <p className="text-[11px] text-white/50 leading-snug">
                          {station.description}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => {
                              const presets = PresetService.getAllPresets();
                              const p = presets.find((item) => item.id === station.suggestedPresetId);
                              if (p) PresetService.applyPreset(p);
                            }}
                            className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" /> Preset Visual
                          </button>

                          <button
                            type="button"
                            onClick={() => playRadioStation(station)}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                              isCurrentPlaying
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                : 'bg-white/[0.08] text-white hover:bg-white/[0.16] border border-white/10'
                            }`}
                          >
                            {isCurrentPlaying ? (
                              <>
                                <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                                <span>Al Aire</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Sintonizar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Studio Telemetry Footer */}
            <div className="px-5 py-3 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between font-mono text-[10px] text-white/40 tracking-wider">
              <span>{currentTabTracks.length} PISTAS</span>
              <span className="text-white/20">•</span>
              <span>{formatTotalDuration(currentTabTracks)}</span>
              <span className="text-white/20">•</span>
              <span className="text-cyan-400/80 font-bold">32-BIT FLOAT</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default PlaylistSidebar;
