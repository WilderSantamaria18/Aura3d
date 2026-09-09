import React, { useState } from 'react';
import {
  X,
  Music,
  Heart,
  ListMusic,
  Plus,
  Trash2,
  Play,
  Upload,
  FolderPlus,
} from 'lucide-react';
import { usePlayerStore } from '../../stores/playerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import type { Track } from '../../types/audio';

export const PlaylistSidebar: React.FC = () => {
  const {
    isSidebarOpen,
    setSidebarOpen,
    queue,
    favorites,
    playlists,
    currentTrack,
    playTrack,
    removeFromQueue,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    isLucid,
    lucidTheme,
  } = usePlayerStore();

  const { loadFile } = useAudioEngine();
  const [activeTab, setActiveTab] = useState<'queue' | 'favorites' | 'playlists'>('queue');
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

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  return (
    <div
      className="fixed inset-y-0 left-0 z-50 w-80 sm:w-96 bg-[#070a14]/98 border-r backdrop-blur-2xl shadow-2xl flex flex-col transition-all duration-300 pointer-events-auto select-none animate-in slide-in-from-left duration-200"
      style={
        isLucid
          ? {
              borderRightColor: `${lucidTheme.primary}45`,
              boxShadow: `12px 0 48px rgba(0,0,0,0.8), 0 0 35px ${lucidTheme.glow}`,
            }
          : {
              borderRightColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '12px 0 48px rgba(0,0,0,0.9)',
            }
      }
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ListMusic className="w-4 h-4 text-white/60" />
          <h3 className="text-white font-medium text-sm tracking-wide">Biblioteca Musical</h3>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 text-white/40 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] px-4 pt-1 gap-1 text-xs">
        <button
          onClick={() => {
            setActiveTab('queue');
            setSelectedPlaylistId(null);
          }}
          className={`pb-2 px-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 text-xs ${
            activeTab === 'queue'
              ? isLucid
                ? 'border-white text-white font-semibold'
                : 'border-white text-white font-semibold'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
          style={
            activeTab === 'queue' && isLucid
              ? { borderColor: lucidTheme.primary, color: lucidTheme.primary }
              : undefined
          }
        >
          <Music className="w-3.5 h-3.5" /> Cola ({queue.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('favorites');
            setSelectedPlaylistId(null);
          }}
          className={`pb-2 px-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 text-xs ${
            activeTab === 'favorites'
              ? isLucid
                ? 'border-white text-white font-semibold'
                : 'border-white text-white font-semibold'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
          style={
            activeTab === 'favorites' && isLucid
              ? { borderColor: lucidTheme.secondary, color: lucidTheme.secondary }
              : undefined
          }
        >
          <Heart className="w-3.5 h-3.5" /> Favoritos ({favorites.length})
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          className={`pb-2 px-2.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 text-xs ${
            activeTab === 'playlists'
              ? isLucid
                ? 'border-white text-white font-semibold'
                : 'border-white text-white font-semibold'
              : 'border-transparent text-white/40 hover:text-white/80'
          }`}
          style={
            activeTab === 'playlists' && isLucid
              ? { borderColor: lucidTheme.primary, color: lucidTheme.primary }
              : undefined
          }
        >
          <ListMusic className="w-3.5 h-3.5" /> Playlists ({playlists.length})
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs font-mono text-white/80 hover:text-white cursor-pointer transition-all active:scale-98">
          <Upload className="w-3.5 h-3.5 text-white/60" />
          <span>Agregar MP3 / WAV</span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.flac"
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
          <div>
            {queue.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-10 font-mono">Cola vacía</p>
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
          <div>
            {favorites.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Heart className="w-7 h-7 text-white/20 mx-auto" />
                <p className="text-white/30 text-xs font-mono">Sin favoritos guardados</p>
              </div>
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
                      className="flex-1 px-3 py-1.5 bg-black/50 border border-white/20 rounded-lg text-xs text-white focus:outline-none focus:border-white/40"
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
                      className="p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl cursor-pointer border border-white/[0.06] flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <h5 className="text-white text-xs font-medium">{pl.name}</h5>
                        <p className="text-white/40 text-[10px] font-mono mt-0.5">{pl.tracks.length} pistas</p>
                      </div>
                      <Play className="w-3.5 h-3.5 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                )}
              </>
            ) : (
              // INSIDE A PLAYLIST
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedPlaylistId(null)}
                    className="text-xs text-white/60 hover:text-white transition-colors"
                  >
                    ← Volver
                  </button>
                  <h4 className="text-white text-xs font-semibold">{activePlaylist?.name}</h4>
                </div>

                {currentTrack && activePlaylist && (
                  <button
                    onClick={() => addToPlaylist(activePlaylist.id, currentTrack)}
                    className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg text-xs text-white/80 border border-white/[0.08] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar pista actual
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
      className={`p-2 rounded-xl flex items-center justify-between gap-2.5 group transition-colors border ${
        isActive
          ? 'bg-white/[0.08] border-white/[0.15] text-white shadow-sm'
          : 'bg-white/[0.02] border-transparent hover:border-white/[0.06] hover:bg-white/[0.04] text-white/80'
      }`}
    >
      <div onClick={onPlay} className="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
          {isActive ? (
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          ) : (
            <Music className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70" />
          )}
        </div>
        <div className="truncate">
          <p className="text-xs font-medium truncate text-white">{track.title}</p>
          <p className="text-[10px] text-white/40 truncate font-mono">{track.artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-white/30 hover:text-rose-400 rounded hover:bg-white/[0.05] transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PlaylistSidebar;

