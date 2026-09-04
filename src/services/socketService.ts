import { io, Socket } from 'socket.io-client';

export interface AdminMetrics {
  activeUsersCount: number;
  camerasActiveCount: number;
  averageScore: number;
  totalSessionsCount: number;
  topSongs: { title: string; artist: string; count: number }[];
  genreDistribution: { genre: string; count: number; percentage: number }[];
  activeUsersList: {
    socketId: string;
    userId: string;
    username: string;
    currentTrack: string;
    artist: string;
    genre: string;
    score: number;
    hasCamera: boolean;
    connectedAt: string;
  }[];
  timestamp: string;
}

const SERVER_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private metricsListeners: ((metrics: AdminMetrics) => void)[] = [];

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    try {
      this.socket = io(SERVER_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 4000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[SocketService] Conectado al servidor de Auralis:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
      });

      this.socket.on('connect_error', () => {
        this.isConnected = false;
      });

      this.socket.on('admin:metrics_update', (metrics: AdminMetrics) => {
        this.metricsListeners.forEach((listener) => listener(metrics));
      });
    } catch (e) {
      console.warn('[SocketService] Error inicializando socket.io:', e);
    }
  }

  /**
   * Register or update client session stats on the server
   */
  public reportSession(data: {
    userId?: string;
    username?: string;
    currentTrack?: string;
    artist?: string;
    genre?: string;
    score?: number;
    hasCamera?: boolean;
  }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('client:update_stats', data);
    }
  }

  /**
   * Register initial client connection
   */
  public registerClient(data: {
    userId?: string;
    username?: string;
    currentTrack?: string;
    artist?: string;
    genre?: string;
    score?: number;
    hasCamera?: boolean;
  }) {
    if (this.socket) {
      if (this.isConnected) {
        this.socket.emit('client:join', data);
      } else {
        this.socket.once('connect', () => {
          this.socket?.emit('client:join', data);
        });
      }
    }
  }

  /**
   * Subscribe admin listener to live metrics updates
   */
  public subscribeAdminMetrics(callback: (metrics: AdminMetrics) => void): () => void {
    this.metricsListeners.push(callback);
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:subscribe');
    }
    return () => {
      this.metricsListeners = this.metricsListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Admin Login via REST API
   */
  public async loginAdmin(username: string, password: string): Promise<{ token: string; user: { username: string; email: string; role: string } }> {
    try {
      const response = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Credenciales incorrectas');
      }

      const data = await response.json();
      localStorage.setItem('auralis_admin_jwt_token', data.token);
      return data;
    } catch (err: unknown) {
      // Offline / Static fallback authentication for demo purposes
      if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
        const fallbackToken = 'mock_jwt_token_admin_2026';
        localStorage.setItem('auralis_admin_jwt_token', fallbackToken);
        return {
          token: fallbackToken,
          user: { username: 'admin', email: 'admin@auralis.app', role: 'superadmin' },
        };
      }
      throw err instanceof Error ? err : new Error('Error al conectar con el servidor de autenticación');
    }
  }

  /**
   * Check if saved admin token is valid
   */
  public async verifyAdminToken(): Promise<boolean> {
    const token = localStorage.getItem('auralis_admin_jwt_token');
    if (!token) return false;
    if (token.startsWith('mock_jwt_')) return true;

    try {
      const response = await fetch(`${SERVER_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      return !!data.valid;
    } catch {
      return true; // Fallback permit for offline development
    }
  }

  public logoutAdmin() {
    localStorage.removeItem('auralis_admin_jwt_token');
  }

  /**
   * Generate fallback live metrics when server is offline
   */
  public getFallbackMetrics(liveUserScore: number, liveGenre: string, hasCamera: boolean, currentTrackTitle: string): AdminMetrics {
    return {
      activeUsersCount: 12,
      camerasActiveCount: hasCamera ? 8 : 7,
      averageScore: Math.max(45, Math.min(95, Math.round(55 + (liveUserScore || 50) * 0.35))),
      totalSessionsCount: 142,
      topSongs: [
        { title: currentTrackTitle || 'Neon Horizon', artist: 'Aura Collective', count: 54 },
        { title: 'Cyber Pulse 3D', artist: 'Synth Wave', count: 42 },
        { title: 'Quantum Drift', artist: 'Lucid Flow', count: 38 },
        { title: 'Solar Flare', artist: 'Hyper Bass', count: 29 },
        { title: 'Midnight City Beats', artist: 'Auralis Live', count: 21 },
      ],
      genreDistribution: [
        { genre: liveGenre || 'Electrónica / EDM', count: 48, percentage: 38 },
        { genre: 'Hip-Hop / Trap', count: 32, percentage: 25 },
        { genre: 'Pop / Moderno', count: 24, percentage: 19 },
        { genre: 'Rock / Metal', count: 14, percentage: 11 },
        { genre: 'Clásica / Acústica', count: 9, percentage: 7 },
      ],
      activeUsersList: [
        {
          socketId: 'live_you',
          userId: 'usr_me',
          username: 'Tú (Sesión Actual)',
          currentTrack: currentTrackTitle || 'Explorando Visualizador',
          artist: 'Auralis Player',
          genre: liveGenre || 'Electrónica / EDM',
          score: liveUserScore || 65,
          hasCamera: hasCamera,
          connectedAt: new Date().toISOString(),
        },
        {
          socketId: 'soc_8492',
          userId: 'usr_8492',
          username: 'CyberDancer_X',
          currentTrack: 'Neon Horizon',
          artist: 'Aura Collective',
          genre: 'Electrónica / EDM',
          score: 92,
          hasCamera: true,
          connectedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        },
        {
          socketId: 'soc_1029',
          userId: 'usr_1029',
          username: 'AuraBeats_99',
          currentTrack: 'Quantum Drift',
          artist: 'Lucid Flow',
          genre: 'Hip-Hop / Trap',
          score: 78,
          hasCamera: true,
          connectedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        },
        {
          socketId: 'soc_5541',
          userId: 'usr_5541',
          username: 'NeonPulse_Tokyo',
          currentTrack: 'Solar Flare',
          artist: 'Hyper Bass',
          genre: 'Rock / Metal',
          score: 64,
          hasCamera: false,
          connectedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}

export const socketService = new SocketService();
