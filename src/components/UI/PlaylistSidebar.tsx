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
      className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 max-w-[100vw] bg-surface-overlay border-r border-border-subtle material-thick shadow-[20px_0_60px_rgba(0,0,0,0.85)] flex flex-col transition-all duration-300 pointer-events-auto select-none animate-in slide-in-from-left duration-200"
      style={{ fontFeatureSettings: "'ss01', 'cv01'" }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center text-ios-teal shadow-sm">
            <ListMusic className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-text-primary font-semibold text-caption sm:text-body tracking-tight">Biblioteca de Estudio</h3>
            <p className="text-caption font-mono text-text-tertiary">Gestor de colas, listas y radio</p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="min-h-11 min-w-11 text-text-tertiary hover:text-text-primary rounded-control hover:bg-surface-subtle transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Cerrar biblioteca"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* iOS Segmented Control Tabs */}
      <div className="p-2 border-b border-border-subtle">
        <div
          role="tablist"
          aria-label="Secciones de la biblioteca"
          className="flex p-1 bg-surface-subtle border border-border-subtle rounded-control gap-0.5 text-caption overflow-x-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'queue'}
            aria-controls="tabpanel-queue"
            onClick={() => {
              setActiveTab('queue');
              setSelectedPlaylistId(null);
            }}
            className={`flex-1 min-h-11 py-1.5 px-2 rounded-control font-medium transition-all flex items-center justify-center gap-1 text-caption whitespace-nowrap cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-surface-active text-text-primary font-semibold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
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
            className={`flex-1 min-h-11 py-1.5 px-2 rounded-control font-medium transition-all flex items-center justify-center gap-1 text-caption whitespace-nowrap cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-surface-active text-text-primary font-semibold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
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
            className={`flex-1 min-h-11 py-1.5 px-2 rounded-control font-medium transition-all flex items-center justify-center gap-1 text-caption whitespace-nowrap cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-surface-active text-text-primary font-semibold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
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
            className={`flex-1 min-h-11 py-1.5 px-2 rounded-control font-medium transition-all flex items-center justify-center gap-1 text-caption whitespace-nowrap cursor-pointer ${
              activeTab === 'radio'
                ? 'bg-surface-active text-text-primary font-semibold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Radio className="w-3 h-3" /> Radio
          </button>
        </div>
      </div>

      {/* Action Bar / Audio File Pick */}
      <div className="p-3 bg-surface-subtle border-b border-border-subtle flex items-center gap-2">
        <label className="flex-1 min-h-11 flex items-center justify-center gap-2 py-2 px-3 bg-surface-subtle hover:bg-surface-active border border-border-subtle rounded-control text-caption font-sans text-text-primary cursor-pointer transition-all active:scale-[0.98]">
          <Upload className="w-3.5 h-3.5 text-ios-teal" />
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
                  <span className="text-caption text-text-tertiary font-mono uppercase tracking-wider">Tus Listas</span>
                  <button
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="min-h-11 px-3 flex items-center gap-1 text-caption text-text-primary hover:text-ios-teal font-medium"
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
                      className="flex-1 min-h-11 px-3 py-1.5 bg-surface-subtle border border-border-subtle rounded-control text-caption text-text-primary focus:outline-none focus:border-ios-teal font-mono"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="min-h-11 px-4 py-1.5 bg-white text-black font-semibold rounded-control text-caption hover:bg-neutral-200 transition-colors"
                    >
                      Crear
                    </button>
                  </form>
                )}

                {playlists.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <FolderPlus className="w-7 h-7 text-text-tertiary mx-auto" />
                    <p className="text-text-tertiary text-caption font-mono">Crea tu primera playlist</p>
                  </div>
                ) : (
                  playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylistId(pl.id)}
                      className="min-h-11 p-3 rounded-card bg-surface-subtle hover:bg-surface-active border border-border-subtle flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-control bg-surface-subtle border border-border-subtle flex items-center justify-center">
                          <ListMusic className="w-4 h-4 text-text-tertiary" />
                        </div>
                        <div>
                          <p className="text-caption font-medium text-text-primary">{pl.name}</p>
                          <p className="text-caption text-text-tertiary font-mono">
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
                    className="min-h-11 px-3 text-caption text-ios-teal hover:underline font-mono flex items-center"
                  >
                    ← Volver a playlists
                  </button>
                  <span className="text-caption font-medium text-text-primary">{activePlaylist?.name}</span>
                </div>

                {currentTrack && activePlaylist && (
                  <button
                    onClick={() => addToPlaylist(activePlaylist.id, currentTrack)}
                    className="w-full min-h-11 py-2 bg-surface-subtle hover:bg-surface-active rounded-control text-caption text-text-primary border border-border-subtle flex items-center justify-center gap-1.5 transition-colors font-mono"
                  >
                    <Plus className="w-3.5 h-3.5 text-ios-teal" /> Agregar pista actual
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
            <div className="p-3 rounded-card bg-surface-subtle border border-border-subtle">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
                </span>
                <span className="text-caption font-mono tracking-widest uppercase text-status-success font-semibold">
                  EMISORAS EN VIVO 24/7
                </span>
              </div>
              <p className="text-caption text-text-secondary leading-relaxed font-sans">
                Transmisiones continuas sin comerciales procesadas directamente por el Analizador Web Audio de Aura3D.
              </p>
            </div>

            {RADIO_STATIONS.map((station) => {
              const isCurrentPlaying = currentTrack?.id === station.id && isPlaying;

              return (
                <div
                  key={station.id}
                  className={`p-3 rounded-card transition-all border ${
                    isCurrentPlaying
                      ? 'bg-surface-active border-border-strong shadow-lg'
                      : 'bg-surface-subtle border-border-subtle hover:bg-surface-active'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-control flex items-center justify-center border border-border-subtle text-ios-teal bg-ios-teal/10"
                      >
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-caption font-medium text-text-primary tracking-tight">{station.name}</h4>
                        <span className="text-caption font-mono text-text-tertiary">{station.genre}</span>
                      </div>
                    </div>

                    <span className="text-caption font-mono px-1.5 py-0.5 rounded-badge bg-surface-subtle text-text-secondary border border-border-subtle">
                      {station.bitrate}
                    </span>
                  </div>

                  <p className="text-caption text-text-secondary mb-3 leading-snug">
                    {station.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                    <button
                      onClick={() => {
                        const presets = PresetService.getAllPresets();
                        const p = presets.find((item) => item.id === station.suggestedPresetId);
                        if (p) PresetService.applyPreset(p);
                      }}
                      className="min-h-11 px-2 text-caption font-mono text-ios-teal hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Preset Visual
                    </button>

                    <button
                      onClick={() => playRadioStation(station)}
                      className={`min-h-11 px-3 py-1 rounded-control text-caption font-medium flex items-center gap-1.5 transition-all ${
                        isCurrentPlaying
                          ? 'bg-status-success/20 text-status-success border border-status-success/40'
                          : 'bg-surface-subtle text-text-primary hover:bg-surface-active'
                      }`}
                    >
                      {isCurrentPlaying ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 animate-pulse text-status-success" />
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
      className={`min-h-11 p-2.5 rounded-control flex items-center justify-between gap-3 group transition-all border ${
        isActive
          ? 'bg-surface-active border-border-strong text-text-primary shadow-sm'
          : 'bg-surface-subtle border-border-subtle hover:bg-surface-active text-text-secondary'
      }`}
    >
      <div onClick={onPlay} className="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-control flex items-center justify-center flex-shrink-0 transition-colors ${
          isActive ? 'bg-ios-teal/20 text-ios-teal' : 'bg-surface-subtle border border-border-subtle'
        }`}>
          {isActive ? (
            /* Mini-ecualizador animado de 3 barras */
            <div className="flex items-end gap-[1.5px] h-3.5 w-3.5 justify-center">
              <span className="w-[2px] bg-ios-teal rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-full" />
              <span className="w-[2px] bg-ios-teal rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.15s] h-2/3" />
              <span className="w-[2px] bg-ios-teal rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.3s] h-4/5" />
            </div>
          ) : (
            <Music className="w-3.5 h-3.5 text-text-tertiary group-hover:text-text-primary" />
          )}
        </div>
        <div className="truncate">
          <p className="text-caption font-medium truncate text-text-primary tracking-tight">{track.title}</p>
          <p className="text-caption text-text-tertiary truncate font-mono mt-0.5">{track.artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {onRemove && (
          <button
            onClick={onRemove}
            className="min-h-11 min-w-11 text-text-tertiary hover:text-status-error rounded-control hover:bg-status-error/10 transition-colors flex items-center justify-center"
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
