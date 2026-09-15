import React, { useState } from 'react';
import {
  X,
  Music,
  Heart,
  ListMusic,
  Plus,
  Trash2,
  Upload,
  FolderPlus,
  Radio,
  Sparkles,
  Play,
  Volume2,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { RADIO_STATIONS } from '../../config/radioStations';
import { PresetService } from '../../services/presetService';
import { EmptyState } from '../Common/EmptyState';
import type { Track } from '../../types/audio';

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
    removeFromQueue,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
  } = usePlayerStore();

  const { loadFile, playRadioStation } = useAudioEngine();
  const [activeTab, setActiveTab] = useState<'queue' | 'favorites' | 'playlists' | 'radio'>('queue');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  if (!isSidebarOpen) return null;

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name)) {
          loadFile(file);
        }
      });
    }
  };

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de Audio de Estudio"
      className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 max-w-[100vw] bg-[#0c101a]/95 border-r border-white/[0.1] backdrop-blur-3xl shadow-[20px_0_60px_rgba(0,0,0,0.85)] flex flex-col transition-all duration-300 pointer-events-auto select-none animate-in slide-in-from-left duration-200"
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-cyan-400 shadow-sm">
            <ListMusic className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-xs sm:text-sm tracking-tight">Biblioteca de Estudio</h3>
            <p className="text-[10px] font-mono text-white/65">Gestor de colas, listas y radio</p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 text-white/60 hover:text-white rounded-[8px] hover:bg-white/[0.08] transition-colors cursor-pointer"
          aria-label="Cerrar biblioteca"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* iOS Segmented Control Tabs */}
      <div className="p-2 border-b border-white/[0.08]">
        <div
          role="tablist"
          aria-label="Secciones de la biblioteca"
          className="flex p-1 bg-white/[0.04] border border-white/[0.08] rounded-[12px] gap-0.5 text-xs overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'queue'}
            aria-controls="tabpanel-queue"
            onClick={() => {
              setActiveTab('queue');
              setSelectedPlaylistId(null);
            }}
            className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-[10px] font-medium transition-all flex items-center justify-center gap-1 text-[11px] whitespace-nowrap cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Music className="w-3 h-3" /> Cola ({queue.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'favorites'}
            aria-controls="tabpanel-favorites"
            onClick={() => {
              setActiveTab('favorites');
              setSelectedPlaylistId(null);
            }}
            className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-[10px] font-medium transition-all flex items-center justify-center gap-1 text-[11px] whitespace-nowrap cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Heart className="w-3 h-3" /> Favoritos ({favorites.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'playlists'}
            aria-controls="tabpanel-playlists"
            onClick={() => {
              setActiveTab('playlists');
              setSelectedPlaylistId(null);
            }}
            className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-[10px] font-medium transition-all flex items-center justify-center gap-1 text-[11px] whitespace-nowrap cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <ListMusic className="w-3 h-3" /> Listas ({playlists.length})
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'radio'}
            aria-controls="tabpanel-radio"
            onClick={() => {
              setActiveTab('radio');
              setSelectedPlaylistId(null);
            }}
            className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-[10px] font-medium transition-all flex items-center justify-center gap-1 text-[11px] whitespace-nowrap cursor-pointer ${
              activeTab === 'radio'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" /> Radio
          </button>
        </div>
      </div>

      {/* Action Bar / Audio File Pick */}
      <div className="p-3 bg-white/[0.01] border-b border-white/[0.04] flex items-center gap-2">
        <label className="flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-[10px] text-xs font-sans text-white/90 hover:text-white cursor-pointer transition-all active:scale-[0.98]">
          <Upload className="w-3.5 h-3.5 text-[#00e5ff]" />
          <span>Importar Audio Local</span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
            multiple
            onChange={handleLocalFilePick}
            className="hidden"
          />
        </label>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {/* QUEUE TAB */}
        {activeTab === 'queue' && (
          <div className="space-y-1">
            {queue.length === 0 ? (
              <EmptyState
                icon={Upload}
                title="Cola de reproducción vacía"
                description="Arrastra tus archivos de audio aquí o carga pistas desde tu biblioteca."
              />
            ) : (
              queue.map((track, idx) => (
                <TrackItem
                  key={`${track.id}_${idx}`}
                  track={track}
                  isActive={currentTrack?.id === track.id}
                  onPlay={() => playTrack(track)}
                  onRemove={() => removeFromQueue(idx)}
                />
              ))
            )}
          </div>
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <div className="space-y-1">
            {favorites.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="Sin favoritos guardados"
                description="Haz clic en el icono de corazón en cualquier canción para añadirla a tu lista de favoritos."
              />
            ) : (
              favorites.map((track) => (
                <TrackItem
                  key={track.id}
                  track={track}
                  isActive={currentTrack?.id === track.id}
                  onPlay={() => playTrack(track)}
                />
              ))
            )}
          </div>
        )}

        {/* PLAYLISTS TAB */}
        {activeTab === 'playlists' && (
          <div className="space-y-3">
            {!selectedPlaylistId ? (
              <>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-white/50 font-mono uppercase tracking-wider">Tus Listas</span>
                  <button
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="flex items-center gap-1 text-xs text-white/80 hover:text-white font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva Playlist
                  </button>
                </div>

                {isCreatingPlaylist && (
                  <form onSubmit={handleCreatePlaylist} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre de la playlist..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-black/50 border border-white/20 rounded-lg text-xs text-white focus:outline-none focus:border-white/40 font-mono"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-white text-black font-semibold rounded-lg text-xs hover:bg-neutral-200 transition-colors"
                    >
                      Crear
                    </button>
                  </form>
                )}

                {playlists.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <FolderPlus className="w-7 h-7 text-white/20 mx-auto" />
                    <p className="text-white/30 text-xs font-mono">Crea tu primera playlist</p>
                  </div>
                ) : (
                  playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylistId(pl.id)}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                          <ListMusic className="w-4 h-4 text-white/50" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white">{pl.name}</p>
                          <p className="text-[10px] text-white/40 font-mono">
                            {pl.tracks.length} {pl.tracks.length === 1 ? 'canción' : 'canciones'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <button
                    onClick={() => setSelectedPlaylistId(null)}
                    className="text-xs text-[#00e5ff] hover:underline font-mono"
                  >
                    ← Volver a playlists
                  </button>
                  <span className="text-xs font-medium text-white">{activePlaylist?.name}</span>
                </div>

                {currentTrack && activePlaylist && (
                  <button
                    onClick={() => addToPlaylist(activePlaylist.id, currentTrack)}
                    className="w-full py-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl text-xs text-white/80 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-colors font-mono"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#00e5ff]" /> Agregar pista actual
                  </button>
                )}

                {activePlaylist?.tracks.map((track) => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    isActive={currentTrack?.id === track.id}
                    onPlay={() => playTrack(track)}
                    onRemove={() => removeFromPlaylist(activePlaylist.id, track.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* RADIO STATIONS TAB */}
        {activeTab === 'radio' && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-black/50 border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-semibold">
                  EMISORAS EN VIVO 24/7
                </span>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                Transmisiones continuas sin comerciales procesadas directamente por el Analizador Web Audio de Aura3D.
              </p>
            </div>

            {RADIO_STATIONS.map((station) => {
              const isCurrentPlaying = currentTrack?.id === station.id && isPlaying;

              return (
                <div
                  key={station.id}
                  className={`p-3 rounded-2xl transition-all border ${
                    isCurrentPlaying
                      ? 'bg-white/[0.08] border-white/20 shadow-lg'
                      : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10"
                        style={{
                          backgroundColor: `${station.accentColor}22`,
                          color: station.accentColor,
                        }}
                      >
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-white tracking-tight">{station.name}</h4>
                        <span className="text-[10px] font-mono text-white/50">{station.genre}</span>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/60 border border-white/10">
                      {station.bitrate}
                    </span>
                  </div>

                  <p className="text-[11px] text-white/50 mb-3 leading-snug">
                    {station.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => {
                        const presets = PresetService.getAllPresets();
                        const p = presets.find((item) => item.id === station.suggestedPresetId);
                        if (p) PresetService.applyPreset(p);
                      }}
                      className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" /> Preset Visual
                    </button>

                    <button
                      onClick={() => playRadioStation(station)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isCurrentPlaying
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[0.08] text-white hover:bg-white/[0.16]'
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
    </div>
  );
};

const TrackItem: React.FC<{
  track: Track;
  isActive: boolean;
  onPlay: () => void;
  onRemove?: () => void;
}> = ({ track, isActive, onPlay, onRemove }) => {
  return (
    <div
      className={`p-2.5 rounded-[12px] flex items-center justify-between gap-3 group transition-all border btn-spring ${
        isActive
          ? 'bg-white/[0.08] border-white/[0.14] text-white shadow-sm'
          : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.05] text-white/80'
      }`}
    >
      <div onClick={onPlay} className="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-colors ${
          isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/[0.04] border border-white/[0.08]'
        }`}>
          {isActive ? (
            /* Mini-ecualizador animado de 3 barras */
            <div className="flex items-end gap-[1.5px] h-3.5 w-3.5 justify-center">
              <span className="w-[2px] bg-cyan-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
              <span className="w-[2px] bg-cyan-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.15s] h-2/3" />
              <span className="w-[2px] bg-cyan-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.3s] h-4/5" />
            </div>
          ) : (
            <Music className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70" />
          )}
        </div>
        <div className="truncate">
          <p className="text-xs font-medium truncate text-white tracking-tight">{track.title}</p>
          <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{track.artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-white/30 hover:text-rose-400 rounded-[6px] hover:bg-rose-500/10 transition-colors"
            title="Eliminar de la cola"
            aria-label="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PlaylistSidebar;
