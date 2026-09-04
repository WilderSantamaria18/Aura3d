import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { socketService, type AdminMetrics } from '../../services/socketService';
import { usePlayerStore } from '../../stores/playerStore';
import { NotificationBell, type AdminNotification } from './NotificationBell';
import { UserManagement, type AdminUserRecord } from './UserManagement';
import { SessionAnalytics, type AdminSessionRecord } from './SessionAnalytics';
import { PerformanceMonitor, type PerformanceStats } from './PerformanceMonitor';
import {
  Users,
  Video,
  Activity,
  Flame,
  Music,
  TrendingUp,
  RefreshCw,
  LogOut,
  Radio,
  Sparkles,
  LayoutDashboard,
  Cpu,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const { intensityScore, detectedGenre, vrMode, currentTrack } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'sessions' | 'performance'>('dashboard');

  const [metrics, setMetrics] = useState<AdminMetrics>(() =>
    socketService.getFallbackMetrics(intensityScore, detectedGenre, vrMode, currentTrack?.title || '')
  );
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [sessionsList, setSessionsList] = useState<AdminSessionRecord[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    clientFPS: 60,
    clientLatencyMs: 18,
    serverMemoryMB: 48,
    serverUptimeSeconds: 14280,
    activeSocketsCount: 3,
    audioProcessingTimeMs: 0.18,
    gpuLoadEstimate: '22% (WebGL2 OK)',
  });
  const [notifications, setNotifications] = useState<AdminNotification[]>([
    {
      id: 'n_1',
      type: 'success',
      title: 'Servidor Operacional',
      message: 'Canal WebSocket y backend conectados correctamente.',
      timestamp: new Date().toISOString(),
      read: false,
    },
    {
      id: 'n_2',
      type: 'info',
      title: 'Clasificador ML Activo',
      message: 'DSP FFT clasificando géneros en tiempo real.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      read: true,
    },
  ]);

  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Load secondary data
  const loadData = async () => {
    setLastRefreshed(new Date());
    const [fetchedUsers, fetchedSessions, fetchedPerf] = await Promise.all([
      socketService.fetchUsers(),
      socketService.fetchSessions(),
      socketService.fetchPerformance(),
    ]);
    setUsersList(fetchedUsers);
    setSessionsList(fetchedSessions);
    setPerformanceStats(fetchedPerf);
  };

  useEffect(() => {
    loadData();

    // 1. Subscribe to WebSocket Live Broadcasts
    const unsubscribeMetrics = socketService.subscribeAdminMetrics((liveMetrics) => {
      setMetrics(liveMetrics);
      setIsLiveConnected(true);
      setLastRefreshed(new Date());
    });

    const unsubscribeNotifications = socketService.subscribeNotifications((notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    // 2. Report own active session to socket
    socketService.reportSession({
      currentTrack: currentTrack?.title || 'Explorando Visualizador 3D',
      artist: currentTrack?.artist || 'Auralis',
      genre: detectedGenre,
      score: intensityScore,
      hasCamera: vrMode,
    });

    // 3. Fallback poller to ensure continuous chart animation even offline
    const interval = setInterval(() => {
      if (!isLiveConnected) {
        setMetrics(
          socketService.getFallbackMetrics(
            intensityScore,
            detectedGenre,
            vrMode,
            currentTrack?.title || ''
          )
        );
      }
    }, 4000);

    return () => {
      unsubscribeMetrics();
      unsubscribeNotifications();
      clearInterval(interval);
    };
  }, [intensityScore, detectedGenre, vrMode, currentTrack, isLiveConnected]);

  // Notifications handlers
  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const handleClearAll = () => {
    setNotifications([]);
  };

  // CSV Export handlers
  const handleExportUsers = () => {
    socketService.exportCSV('users', usersList);
  };
  const handleExportSessions = () => {
    socketService.exportCSV('sessions', sessionsList);
  };

  // ── Top 5 Songs Bar Chart Data ────────────────────────────────────────────
  const barChartData = {
    labels: metrics.topSongs.map((s) => s.title.substring(0, 18)),
    datasets: [
      {
        label: 'Reproducciones',
        data: metrics.topSongs.map((s) => s.count),
        backgroundColor: [
          'rgba(0, 242, 254, 0.75)',
          'rgba(255, 8, 138, 0.75)',
          'rgba(57, 255, 20, 0.75)',
          'rgba(255, 230, 0, 0.75)',
          'rgba(196, 113, 237, 0.75)',
        ],
        borderColor: ['#00f2fe', '#ff088a', '#39FF14', '#ffe600', '#c471ed'],
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const barChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(9, 14, 28, 0.95)',
        titleColor: '#00f2fe',
        bodyColor: '#fff',
        borderColor: 'rgba(0, 242, 254, 0.4)',
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)', font: { family: 'monospace' } },
      },
      y: {
        grid: { display: false },
        ticks: { color: '#ffffff', font: { family: 'monospace', weight: 'bold' as const } },
      },
    },
  };

  // ── Genres Doughnut Chart Data ────────────────────────────────────────────
  const doughnutData = {
    labels: metrics.genreDistribution.map((g) => g.genre),
    datasets: [
      {
        data: metrics.genreDistribution.map((g) => g.count),
        backgroundColor: [
          '#00f2fe',
          '#ff088a',
          '#39FF14',
          '#ffe600',
          '#c471ed',
          '#ff5e00',
          '#00ffb3',
        ],
        borderColor: '#090e1c',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: { family: 'monospace', size: 10 },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(9, 14, 28, 0.95)',
        titleColor: '#00f2fe',
        bodyColor: '#fff',
        borderColor: 'rgba(0, 242, 254, 0.4)',
        borderWidth: 1,
      },
    },
    cutout: '68%',
  };

  return (
    <div className="space-y-4 font-mono text-white select-none">
      {/* ── Top Bar Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider flex items-center gap-2">
              AURALIS 3D • PANEL DE ADMINISTRACIÓN
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-normal">
                {isLiveConnected ? '🟢 WebSocket En Vivo' : '🟡 Modo Sync / Local'}
              </span>
            </h2>
            <p className="text-[10px] text-white/50">
              Telemetría en tiempo real, análisis de datos, usuarios y rendimiento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 hidden sm:inline font-mono">
            {lastRefreshed.toLocaleTimeString()}
          </span>
          {/* Notifications Dropdown Bell */}
          <NotificationBell
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClearAll={handleClearAll}
          />

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
            title="Refrescar métricas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* ── Navigation Tab Bar ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(0,242,254,0.35)]'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard Principal</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(0,242,254,0.35)]'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Gestión de Usuarios</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sessions'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(0,242,254,0.35)]'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Análisis de Sesiones</span>
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'performance'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(0,242,254,0.35)]'
              : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Rendimiento del Sistema</span>
        </button>
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* ── 4 Main Live Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Active Users */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-1 relative overflow-hidden group hover:border-cyan-400/40 transition-all">
              <div className="flex items-center justify-between text-white/60 text-xs">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  USUARIOS ACTIVOS
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {metrics.activeUsersCount}
              </span>
              <span className="text-[9px] text-cyan-300/80">Conectados en tiempo real</span>
            </div>

            {/* Active Cameras */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-1 relative overflow-hidden group hover:border-emerald-400/40 transition-all">
              <div className="flex items-center justify-between text-white/60 text-xs">
                <span className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                  CÁMARAS ACTIVAS
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {Math.round((metrics.camerasActiveCount / Math.max(1, metrics.activeUsersCount)) * 100)}%
                </span>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-300 tracking-tight">
                {metrics.camerasActiveCount}
              </span>
              <span className="text-[9px] text-emerald-300/80">Tracking VR 3D encendido</span>
            </div>

            {/* Average Intensity Score */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-1 relative overflow-hidden group hover:border-pink-400/40 transition-all">
              <div className="flex items-center justify-between text-white/60 text-xs">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-pink-400" />
                  SCORE PROMEDIO
                </span>
                <Flame className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-pink-400 tracking-tight">
                {metrics.averageScore}{' '}
                <span className="text-xs text-white/40 font-normal">/100</span>
              </span>
              <span className="text-[9px] text-pink-300/80">Intensidad de movimiento</span>
            </div>

            {/* Total Sessions / Tracks */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-1 relative overflow-hidden group hover:border-yellow-400/40 transition-all">
              <div className="flex items-center justify-between text-white/60 text-xs">
                <span className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-yellow-400" />
                  REPRODUCCIONES
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-yellow-300 tracking-tight">
                {metrics.totalSessionsCount}
              </span>
              <span className="text-[9px] text-yellow-300/80">Sesiones registradas</span>
            </div>
          </div>

          {/* ── Visual Analytics: 2 Charts Side-by-Side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Top 5 Songs Bar Chart */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  TOP 5 CANCIONES MÁS REPRODUCIDAS
                </h3>
                <span className="text-[10px] text-white/40">Total plays</span>
              </div>
              <div className="h-48 w-full">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>

            {/* Detected Genres Doughnut Chart */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-pink-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  DISTRIBUCIÓN DE GÉNEROS (ML EN TIEMPO REAL)
                </h3>
                <span className="text-[10px] text-white/40">DSP Spectral</span>
              </div>
              <div className="h-48 w-full flex items-center justify-center">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
          </div>

          {/* ── Live Connected Users Table ── */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                TABLA DE USUARIOS Y SESIONES EN VIVO
              </h3>
              <span className="text-[10px] text-white/40">
                {metrics.activeUsersList.length} conectados ahora
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-white/60 text-[10px] uppercase">
                    <th className="p-2.5">Usuario</th>
                    <th className="p-2.5">Canción Actual</th>
                    <th className="p-2.5">Género Detectado (ML)</th>
                    <th className="p-2.5">Score</th>
                    <th className="p-2.5">Cámara VR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {metrics.activeUsersList.map((user, idx) => (
                    <tr key={user.socketId || idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-2.5 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span>{user.username}</span>
                      </td>
                      <td className="p-2.5 text-white/80">{user.currentTrack}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                          {user.genre}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold" style={{ color: user.score >= 70 ? '#ff088a' : '#00f2fe' }}>
                        {user.score} / 100
                      </td>
                      <td className="p-2.5">
                        {user.hasCamera ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            🟢 ACTIVA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] bg-red-500/20 text-red-300 border border-red-500/40">
                            🔴 INACTIVA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === 'users' && <UserManagement users={usersList} onExportCSV={handleExportUsers} />}

      {/* ── Sessions Tab ── */}
      {activeTab === 'sessions' && (
        <SessionAnalytics sessions={sessionsList} onExportCSV={handleExportSessions} />
      )}

      {/* ── Performance Tab ── */}
      {activeTab === 'performance' && <PerformanceMonitor stats={performanceStats} />}
    </div>
  );
};

export default AdminDashboard;
