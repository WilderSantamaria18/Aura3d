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
      className="fixed inset-y-0 left-0 z-50 w-80 sm:w-96 bg-[#080b18]/95 border-r backdrop-blur-2xl shadow-2xl flex flex-col transition-all duration-300 pointer-events-auto select-none animate-in slide-in-from-left duration-200"
      style={
        isLucid
          ? {
              borderRightColor: `${lucidTheme.primary}45`,
              boxShadow: `12px 0 48px rgba(0,0,0,0.7), 0 0 35px ${lucidTheme.glow}`,
            }
          : {
              borderRightColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '12px 0 48px rgba(0,0,0,0.8)',
            }
      }
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-semibold text-lg">Biblioteca Musical</h3>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 text-white/60 hover:text-white rounded-full hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 pt-2 gap-2 text-xs">
        <button
          onClick={() => {
            setActiveTab('queue');
            setSelectedPlaylistId(null);
          }}
          className={`pb-2.5 px-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <Music className="w-3.5 h-3.5" /> Cola ({queue.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('favorites');
            setSelectedPlaylistId(null);
          }}
          className={`pb-2.5 px-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'favorites'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <Heart className="w-3.5 h-3.5" /> Favoritos ({favorites.length})
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          className={`pb-2.5 px-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'playlists'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" /> Playlists ({playlists.length})
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-3 bg-white/[0.02] border-b border-white/5 flex items-center gap-2">
        <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-500/15 to-pink-500/15 border border-cyan-400/30 rounded-xl text-xs text-cyan-200 hover:bg-white/10 cursor-pointer transition-all">
          <Upload className="w-3.5 h-3.5" />
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
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        {/* QUEUE TAB */}
        {activeTab === 'queue' && (
          <div>
            {queue.length === 0 ? (
              <p className="text-white/40 text-xs text-center py-8">La cola está vacía.</p>
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
              <div className="text-center py-10 space-y-2">
                <Heart className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-white/40 text-xs">No tienes pistas marcadas con corazón aún.</p>
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
          <div className="space-y-4">
            {!selectedPlaylistId ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Tus Listas</span>
                  <button
                    onClick={() => setIsCreatingPlaylist(true)}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
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
                      className="flex-1 px-3 py-1.5 bg-black/50 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-cyan-500 text-black font-semibold rounded-xl text-xs hover:bg-cyan-400 transition-colors"
                    >
                      Crear
                    </button>
                  </form>
                )}

                {playlists.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <FolderPlus className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-white/40 text-xs">Crea tu primera lista de reproducción.</p>
                  </div>
                ) : (
                  playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylistId(pl.id)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl cursor-pointer border border-white/5 flex items-center justify-between group transition-all"
                    >
                      <div>
                        <h5 className="text-white text-sm font-medium">{pl.name}</h5>
                        <p className="text-cyan-200/50 text-[11px]">{pl.tracks.length} canciones</p>
                      </div>
                      <Play className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    ← Volver a Playlists
                  </button>
                  <h4 className="text-white text-sm font-semibold">{activePlaylist?.name}</h4>
                </div>

                {currentTrack && activePlaylist && (
                  <button
                    onClick={() => addToPlaylist(activePlaylist.id, currentTrack)}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-cyan-300 border border-cyan-500/20 flex items-center justify-center gap-1.5"
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
      className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 group transition-all border ${
        isActive
          ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
          : 'bg-white/[0.03] border-white/5 hover:bg-white/8 text-white/80'
      }`}
    >
      <div onClick={onPlay} className="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center flex-shrink-0">
          {isActive ? (
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
          ) : (
            <Music className="w-4 h-4 text-white/40 group-hover:text-cyan-400" />
          )}
        </div>
        <div className="truncate">
          <p className="text-xs font-medium truncate text-white">{track.title}</p>
          <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-white/30 hover:text-pink-400 rounded-full hover:bg-white/5 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

