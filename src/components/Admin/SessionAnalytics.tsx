import React, { useState, useMemo } from 'react';
import { Search, Download, Filter, Video, Clock, Disc } from 'lucide-react';

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

  const formatDuration = (seconds?: number) => {
    const s = seconds || 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 font-mono text-white select-none">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0b0f1e]/85 border border-white/10 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar canción o usuario..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          {/* Genre Filter */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f1e] text-white">Todos los géneros</option>
              {genresList.map((g) => (
                <option key={g} value={g} className="bg-[#0b0f1e] text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Filter */}
          <div className="relative">
            <Video className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value as any)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="all" className="bg-[#0b0f1e] text-white">Cámara: Todas</option>
              <option value="camera_on" className="bg-[#0b0f1e] text-white">Con Cámara VR</option>
              <option value="camera_off" className="bg-[#0b0f1e] text-white">Sin Cámara</option>
            </select>
          </div>
        </div>

        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(57,255,20,0.15)] w-full sm:w-auto justify-center"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Sesiones (CSV)</span>
        </button>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl bg-[#0b0f1e]/85 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/50 text-[10px] uppercase tracking-widest font-bold">
                <th className="p-3.5">Pista Musical</th>
                <th className="p-3.5">Género Espectral (DSP)</th>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Score de Intensidad</th>
                <th className="p-3.5">Cámara Tracking</th>
                <th className="p-3.5">Duración</th>
                <th className="p-3.5">Hora / Registro</th>
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
                      <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                          <Disc className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate max-w-[200px]">
                          <span className="block truncate">{songName}</span>
                          <span className="text-[10px] text-white/40 font-normal block truncate">
                            {session.artist || 'Auralis Live'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-white/5 text-cyan-300 border border-white/10">
                          {session.genre || 'Electrónica / EDM'}
                        </span>
                      </td>
                      <td className="p-3.5 text-white/70">{userName}</td>
                      <td className="p-3.5">
                        <span
                          className={`font-bold text-xs ${
                            (session.score || 0) >= 80
                              ? 'text-pink-400'
                              : (session.score || 0) >= 60
                              ? 'text-cyan-300'
                              : 'text-yellow-400'
                          }`}
                        >
                          {session.score || 0}
                          <span className="text-[9px] text-white/30 font-normal"> /100</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        {session.hasCamera ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                            <Video className="w-2.5 h-2.5" /> Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] uppercase bg-white/5 text-white/40 border border-white/5">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-white/60 text-[11px] flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-white/30" />
                        {formatDuration(session.duration)}
                      </td>
                      <td className="p-3.5 text-white/40 text-[11px]">
                        {new Date(session.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
