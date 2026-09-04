import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'auralis_cyber_admin_secret_2026';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ── In-Memory & Persistent State Store ──────────────────────────────────────
const ADMIN_CREDENTIALS = {
  username: 'admin',
  // bcrypt hash for 'admin123'
  passwordHash: bcrypt.hashSync('admin123', 8),
  email: 'admin@auralis.app',
  role: 'superadmin',
};

// Active connected client sessions: socketId -> Session Data
const activeSessions = new Map();

// Aggregate history statistics
const songPlayCounts = new Map();
const genreCounts = new Map();

// Seed initial representative demo stats
const INITIAL_DEMO_SONGS = [
  { title: 'Neon Horizon', artist: 'Cyber Wave', count: 48 },
  { title: 'Quantum Drift', artist: 'Aura Collective', count: 35 },
  { title: 'Solar Pulse', artist: 'Lucid Dreams', count: 29 },
  { title: 'Midnight Echoes', artist: 'Synth Vibe', count: 22 },
  { title: 'Bass Resonance', artist: 'Hyper Bass', count: 18 },
];

INITIAL_DEMO_SONGS.forEach((s) => songPlayCounts.set(`${s.title} - ${s.artist}`, s.count));

const INITIAL_GENRES = {
  'Electrónica / EDM': 45,
  'Hip-Hop / Trap': 28,
  'Pop / Moderno': 32,
  'Rock / Metal': 18,
  'Reggaeton / Urbano': 22,
  'Clásica / Acústica': 12,
  'Ambient / Chill': 15,
};

Object.entries(INITIAL_GENRES).forEach(([g, c]) => genreCounts.set(g, c));

// ── Helper: Compute Live Dashboard Metrics ──────────────────────────────────
function computeDashboardMetrics() {
  const sessions = Array.from(activeSessions.values());
  const activeUsersCount = Math.max(1, sessions.length);

  let camerasActiveCount = 0;
  let totalScore = 0;

  sessions.forEach((s) => {
    if (s.hasCamera) camerasActiveCount++;
    totalScore += s.score || 0;
  });

  const averageScore = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 68;

  // Top 5 Songs
  const topSongs = Array.from(songPlayCounts.entries())
    .map(([key, count]) => {
      const [title, artist] = key.split(' - ');
      return { title: title || key, artist: artist || 'Desconocido', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Genre Distribution
  const totalGenreHits = Array.from(genreCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const genreDistribution = Array.from(genreCounts.entries()).map(([genre, count]) => ({
    genre,
    count,
    percentage: Math.round((count / totalGenreHits) * 100),
  }));

  return {
    activeUsersCount,
    camerasActiveCount,
    averageScore,
    totalSessionsCount: songPlayCounts.size + sessions.length,
    topSongs,
    genreDistribution,
    activeUsersList: sessions,
    timestamp: new Date().toISOString(),
  };
}

// ── REST API Routes ─────────────────────────────────────────────────────────

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    activeSessions: activeSessions.size,
    timestamp: new Date().toISOString(),
  });
});

// Admin Login Route -> Issues JWT
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const isUserValid = username === ADMIN_CREDENTIALS.username;
  const isPassValid =
    password === 'admin123' ||
    (isUserValid && bcrypt.compareSync(password, ADMIN_CREDENTIALS.passwordHash));

  if (!isUserValid || !isPassValid) {
    return res.status(401).json({ error: 'Credenciales inválidas. Usuario o contraseña incorrectos.' });
  }

  const token = jwt.sign(
    {
      username: ADMIN_CREDENTIALS.username,
      email: ADMIN_CREDENTIALS.email,
      role: ADMIN_CREDENTIALS.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Autenticación exitosa',
    token,
    user: {
      username: ADMIN_CREDENTIALS.username,
      email: ADMIN_CREDENTIALS.email,
      role: ADMIN_CREDENTIALS.role,
    },
  });
});

// Verify JWT Token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Token expirado o inválido' });
  }
});

// Get Current Metrics Snapshot
app.get('/api/admin/metrics', (req, res) => {
  res.json(computeDashboardMetrics());
});

// ── Socket.io Real-Time Channel ─────────────────────────────────────────────
io.on('connection', (socket) => {
  // 1. Client joins and registers session
  socket.on('client:join', (data) => {
    const session = {
      socketId: socket.id,
      userId: data?.userId || `usr_${socket.id.substring(0, 5)}`,
      username: data?.username || `Bailarín_${socket.id.substring(0, 4)}`,
      currentTrack: data?.currentTrack || 'Explorando Visualizador',
      artist: data?.artist || 'Auralis Live',
      genre: data?.genre || 'Electrónica / EDM',
      score: data?.score || 0,
      hasCamera: !!data?.hasCamera,
      connectedAt: new Date().toISOString(),
      lastActive: Date.now(),
    };

    activeSessions.set(socket.id, session);

    // Update song count
    if (data?.currentTrack) {
      const key = `${data.currentTrack} - ${data.artist || 'Auralis'}`;
      songPlayCounts.set(key, (songPlayCounts.get(key) || 0) + 1);
    }

    // Update genre count
    if (data?.genre) {
      genreCounts.set(data.genre, (genreCounts.get(data.genre) || 0) + 1);
    }

    // Broadcast updated metrics to all admins
    io.emit('admin:metrics_update', computeDashboardMetrics());
  });

  // 2. Client sends live periodic stats
  socket.on('client:update_stats', (data) => {
    const session = activeSessions.get(socket.id);
    if (session) {
      session.currentTrack = data.currentTrack || session.currentTrack;
      session.artist = data.artist || session.artist;
      session.genre = data.genre || session.genre;
      session.score = data.score !== undefined ? data.score : session.score;
      session.hasCamera = data.hasCamera !== undefined ? data.hasCamera : session.hasCamera;
      session.lastActive = Date.now();

      activeSessions.set(socket.id, session);

      // Increment genre count if changed
      if (data.genre && data.genre !== session.genre) {
        genreCounts.set(data.genre, (genreCounts.get(data.genre) || 0) + 1);
      }

      io.emit('admin:metrics_update', computeDashboardMetrics());
    }
  });

  // 3. Admin subscribes for immediate live data
  socket.on('admin:subscribe', () => {
    socket.emit('admin:metrics_update', computeDashboardMetrics());
  });

  // 4. Client disconnect
  socket.on('disconnect', () => {
    activeSessions.delete(socket.id);
    io.emit('admin:metrics_update', computeDashboardMetrics());
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`[Auralis Admin Server] Backend en vivo corriendo en http://localhost:${PORT}`);
  console.log(`[Auralis Admin Server] WebSocket Socket.io listo para conexiones.`);
  console.log(`[Auralis Admin Server] Credenciales Admin por defecto: admin / admin123`);
});
