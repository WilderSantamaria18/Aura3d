import React, { useState, useMemo } from 'react';
import { Music, Search, Download, Filter, Video } from 'lucide-react';

export interface AdminSessionRecord {
  id?: string;
  userId?: string;
  username?: string;
  song?: string;
  currentTrack?: string;
  artist?: string;
  genre?: string;
  score?: number;
  duration?: number;
  hasCamera?: boolean;
  timestamp: string;
}

interface SessionAnalyticsProps {
  sessions: AdminSessionRecord[];
  onExportCSV: () => void;
}

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({ sessions, onExportCSV }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [cameraFilter, setCameraFilter] = useState<'all' | 'camera_on' | 'camera_off'>('all');

  const genresList = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.genre) set.add(s.genre);
    });
    return Array.from(set);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const trackName = (s.song || s.currentTrack || '').toLowerCase();
      const artistName = (s.artist || '').toLowerCase();
      const userName = (s.username || s.userId || '').toLowerCase();
      const matchesSearch =
        trackName.includes(searchTerm.toLowerCase()) ||
        artistName.includes(searchTerm.toLowerCase()) ||
        userName.includes(searchTerm.toLowerCase());

      const matchesGenre = genreFilter === 'all' || s.genre === genreFilter;
      const matchesCamera =
        cameraFilter === 'all' ||
        (cameraFilter === 'camera_on' && !!s.hasCamera) ||
        (cameraFilter === 'camera_off' && !s.hasCamera);

      return matchesSearch && matchesGenre && matchesCamera;
    });
  }, [sessions, searchTerm, genreFilter, cameraFilter]);

  return (
    <div className="space-y-4 font-mono">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar canción o usuario..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Genre Filter */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#090e1c] text-white">Todos los géneros</option>
              {genresList.map((g) => (
                <option key={g} value={g} className="bg-[#090e1c] text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Filter */}
          <div className="relative">
            <Video className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value as any)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#090e1c] text-white">Cámara: Todas</option>
              <option value="camera_on" className="bg-[#090e1c] text-white">Con Cámara VR</option>
              <option value="camera_off" className="bg-[#090e1c] text-white">Sin Cámara</option>
            </select>
          </div>
        </div>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-bold transition-all shadow-[0_0_15px_rgba(57,255,20,0.2)] w-full sm:w-auto justify-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Sesiones (CSV)</span>
        </button>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/60 text-[10px] uppercase">
                <th className="p-3">Pista Musical</th>
                <th className="p-3">Género Espectral (ML)</th>
                <th className="p-3">Usuario</th>
                <th className="p-3">Score de Baile</th>
                <th className="p-3">Cámara VR</th>
                <th className="p-3">Duración</th>
                <th className="p-3">Hora / Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40 text-xs">
                    No se encontraron sesiones registradas con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session, idx) => {
                  const songName = session.song || session.currentTrack || 'Audio en Vivo';
                  const userName = session.username || session.userId || `Bailarín_${idx + 1}`;
                  return (
                    <tr key={session.id || idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Music className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">{songName}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                          {session.genre || 'Electrónica / EDM'}
                        </span>
                      </td>
                      <td className="p-3 text-white/80">{userName}</td>
                      <td className="p-3 font-bold" style={{ color: (session.score || 0) >= 70 ? '#ff088a' : '#00f2fe' }}>
                        {session.score || 0} <span className="text-[10px] text-white/40 font-normal">/100</span>
                      </td>
                      <td className="p-3">
                        {session.hasCamera ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> ACTIVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-red-500/20 text-red-300 border border-red-500/40">
                            INACTIVA
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-white/60 text-[11px]">
                        {session.duration ? `${session.duration}s` : 'En vivo'}
                      </td>
                      <td className="p-3 text-white/40 text-[10px]">
                        {new Date(session.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalytics;
