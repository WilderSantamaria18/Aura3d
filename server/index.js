import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const PORT = process.env.PORT || 4000;
const IS_PROD = process.env.NODE_ENV === 'production';

// ── 1. Secure JWT Secret Handling ──────────────────────────────────────────
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (IS_PROD) {
    console.error('[FATAL SECURITY ERROR] La variable de entorno JWT_SECRET es obligatoria en producción.');
    process.exit(1);
  } else {
    // Generate secure unpredictable random secret for dev/staging
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('[AVISO DE SEGURIDAD] JWT_SECRET no configurado en entorno de desarrollo. Se ha generado una clave efímera segura.');
  }
}

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

// ── 2. In-Memory Database with Safe Disk Persistence ──────────────────────
const usersDb = new Map(); // email/id -> userRecord

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[Storage] No se pudo crear directorio de datos:', err.message);
  }
}

function saveUsersToDisk() {
  try {
    const list = Array.from(usersDb.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Storage] Error al guardar usuarios en disco:', err.message);
  }
}

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const list = JSON.parse(content);
      if (Array.isArray(list)) {
        list.forEach((u) => {
          if (u && u.email) {
            usersDb.set(u.email, u);
          }
        });
        console.log(`[Storage] ${usersDb.size} usuarios cargados desde disco.`);
      }
    }
  } catch (err) {
    console.warn('[Storage] Error al leer usuarios desde disco:', err.message);
  }
}

// Initialize users from disk
loadUsersFromDisk();

// Bootstrap superadmin if none exists
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@auralis.app').toLowerCase().trim();
const adminPassword = process.env.ADMIN_PASSWORD || (IS_PROD ? null : 'AuraAdmin#2026!');

if (!usersDb.has(adminEmail) && adminPassword) {
  const defaultAdminHash = bcrypt.hashSync(adminPassword, 12);
  const initialAdmin = {
    id: 'usr_admin_01',
    username: 'admin',
    email: adminEmail,
    passwordHash: defaultAdminHash,
    role: 'superadmin',
    genres: ['Electrónica / EDM', 'Synthwave'],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
  usersDb.set(adminEmail, initialAdmin);
  saveUsersToDisk();
  console.log(`[Seguridad] Superadmin inicializado para: ${adminEmail}`);
}

// Active connected client sessions: socketId -> Session Data
const activeUsers = new Map(); // userId -> socketId
const activeSessions = new Map(); // socketId -> Session Data

// Session history & stats
const sessionHistory = [];
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

// ── 3. Real Client Telemetry Storage ───────────────────────────────────────
let latestClientMetrics = {
  fps: 60,
  latencyMs: 16,
  audioProcessingTimeMs: 0.15,
  gpuName: 'WebGL2 Hardware Renderer',
  performanceMode: 'high',
  lastReportTime: Date.now(),
};

// ── 4. Rate Limiting Middlewares (In-Memory Sliding Window) ────────────────
const loginAttempts = new Map(); // ip -> { count, resetTime }
const globalRequestCounts = new Map(); // ip -> { count, resetTime }

const globalRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 min
  const maxRequests = 120;

  const record = globalRequestCounts.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }
  globalRequestCounts.set(ip, record);

  if (record.count > maxRequests) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' });
  }
  next();
};

const loginRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins
  const maxAttempts = 10;

  const record = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }
  loginAttempts.set(ip, record);

  if (record.count > maxAttempts) {
    return res.status(429).json({
      error: 'Demasiados intentos fallidos de inicio de sesión. Bloqueado temporalmente por 15 minutos.',
    });
  }
  next();
};

app.use(globalRateLimit);

// ── 5. Helper: Compute Live Dashboard Metrics ──────────────────────────────
function computeDashboardMetrics() {
  const sessions = Array.from(activeSessions.values());
  const activeUsersCount = Math.max(activeUsers.size, sessions.length);

  let camerasActiveCount = 0;
  let totalScore = 0;

  sessions.forEach((s) => {
    if (s.hasCamera) camerasActiveCount++;
    totalScore += s.score || 0;
  });

  const averageScore = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 72;

  // Top 5 Songs
  const topSongs = Array.from(songPlayCounts.entries())
    .map(([key, count]) => {
      const [title, artist] = key.split(' - ');
      return { _id: title || key, title: title || key, artist: artist || 'Desconocido', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Genre Distribution
  const totalGenreHits = Array.from(genreCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const genreDistribution = Array.from(genreCounts.entries()).map(([genre, count]) => ({
    _id: genre,
    genre,
    count,
    percentage: Math.round((count / totalGenreHits) * 100),
  }));

  return {
    totalUsers: usersDb.size + activeUsersCount,
    activeUsersCount,
    activeNow: activeUsersCount,
    camerasActiveCount,
    averageScore,
    totalSessionsCount: songPlayCounts.size + sessionHistory.length + sessions.length,
    topSongs,
    genreDistribution,
    activeUsersList: sessions,
    recentSessions: sessionHistory.slice(0, 50),
    timestamp: new Date().toISOString(),
  };
}

// ── 6. Authentication & Authorization Middlewares ──────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

const adminMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── 7. REST API Routes ─────────────────────────────────────────────────────

// Health Check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'online',
    activeSessions: activeSessions.size,
    activeUsers: activeUsers.size,
    timestamp: new Date().toISOString(),
  });
});

// Register
app.post(['/auth/register', '/api/auth/register'], async (req, res) => {
  try {
    const { username, email, password, genres } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Formato de correo electrónico inválido.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener un mínimo de 8 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (usersDb.has(cleanEmail)) {
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo electrónico.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = `usr_${crypto.randomBytes(5).toString('hex')}`;
    const newUser = {
      id: userId,
      username: username.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'user',
      genres: Array.isArray(genres) ? genres : [],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    usersDb.set(cleanEmail, newUser);
    saveUsersToDisk();

    const token = jwt.sign(
      { userId, username: newUser.username, email: cleanEmail, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId, username: newUser.username, email: cleanEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post(['/auth/login', '/api/auth/login'], loginRateLimit, async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identificador y contraseña requeridos.' });
    }

    let user = usersDb.get(identifier.toLowerCase());
    if (!user) {
      // Look up by username
      for (const u of usersDb.values()) {
        if (u.username.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Esta cuenta ha sido desactivada o bloqueada por un administrador.' });
    }

    // STRICT BCRYPT COMPARE ONLY (Zero plaintext fallback)
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Reset failed login attempts on successful auth
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    loginAttempts.delete(ip);

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    saveUsersToDisk();

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Token
app.get(['/auth/verify', '/api/auth/verify'], authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Admin Stats Endpoint (Protected)
app.get(['/admin/stats', '/api/admin/metrics', '/api/admin/stats'], adminMiddleware, (req, res) => {
  res.json(computeDashboardMetrics());
});

// Admin Users List Endpoint (Protected)
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const users = Array.from(usersDb.values()).map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    genres: u.genres || [],
    isActive: u.isActive !== undefined ? u.isActive : true,
    lastLogin: u.lastLogin || new Date().toISOString(),
    createdAt: u.createdAt || new Date().toISOString(),
  }));
  res.json(users);
});

// Toggle User Active Status (Protected)
app.post('/api/admin/users/:id/toggle-status', adminMiddleware, (req, res) => {
  const { id } = req.params;
  let targetUser = null;

  for (const u of usersDb.values()) {
    if (u.id === id) {
      targetUser = u;
      break;
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'No tienes permisos para modificar al superadministrador.' });
  }

  targetUser.isActive = !targetUser.isActive;
  saveUsersToDisk();

  res.json({
    success: true,
    message: `Usuario ${targetUser.isActive ? 'activado' : 'bloqueado'} con éxito.`,
    user: {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      isActive: targetUser.isActive,
    },
  });
});

// Delete User (Protected)
app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  let targetKey = null;
  let targetUser = null;

  for (const [key, u] of usersDb.entries()) {
    if (u.id === id) {
      targetKey = key;
      targetUser = u;
      break;
    }
  }

  if (!targetUser || !targetKey) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  if (targetUser.id === req.user.userId) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta administrativa.' });
  }

  if (targetUser.role === 'superadmin') {
    return res.status(403).json({ error: 'No se puede eliminar una cuenta de superadministrador.' });
  }

  usersDb.delete(targetKey);
  saveUsersToDisk();

  res.json({ success: true, message: `Usuario ${targetUser.username} eliminado correctamente.` });
});

// Admin Sessions History Endpoint (Protected)
app.get('/api/admin/sessions', adminMiddleware, (req, res) => {
  res.json(sessionHistory.slice(0, 100));
});

// Admin System Performance Endpoint (Protected, Real Client & Server Telemetry)
app.get('/api/admin/performance', adminMiddleware, (req, res) => {
  const memoryUsage = process.memoryUsage();
  const isRecent = Date.now() - latestClientMetrics.lastReportTime < 8000;
  const activeCount = io.sockets.sockets.size;

  res.json({
    clientFPS: isRecent ? latestClientMetrics.fps : activeCount > 0 ? latestClientMetrics.fps : 60,
    clientLatencyMs: latestClientMetrics.latencyMs,
    serverMemoryMB: Math.round(memoryUsage.rss / 1024 / 1024),
    serverUptimeSeconds: Math.round(process.uptime()),
    activeSocketsCount: activeCount,
    audioProcessingTimeMs: latestClientMetrics.audioProcessingTimeMs,
    gpuLoadEstimate: `${latestClientMetrics.gpuName} [${latestClientMetrics.performanceMode.toUpperCase()}]`,
  });
});

// CSV Export Endpoint (Protected)
app.get('/api/admin/export/csv', adminMiddleware, (req, res) => {
  const type = req.query.type === 'users' ? 'users' : 'sessions';
  if (type === 'users') {
    const users = Array.from(usersDb.values());
    const header = 'id,username,email,role,isActive,createdAt\n';
    const rows = users
      .map((u) => `"${u.id}","${u.username}","${u.email}","${u.role}",${u.isActive !== false},"${u.createdAt}"`)
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="auralis_users.csv"');
    return res.send(header + rows);
  } else {
    const header = 'userId,song,genre,score,duration,timestamp\n';
    const rows = sessionHistory
      .map((s) => `"${s.userId}","${s.song}","${s.genre}","${s.score}","${s.duration}","${s.timestamp}"`)
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="auralis_sessions.csv"');
    return res.send(header + rows);
  }
});

// ── 8. Socket.io Real-Time Channel ─────────────────────────────────────────
io.on('connection', (socket) => {
  // 1. Session Data stream from Auralis App
  socket.on('session-data', (data) => {
    const { userId, song, genre, score, duration } = data || {};
    const sessionEntry = {
      userId: userId || `usr_${socket.id.substring(0, 5)}`,
      song: song || 'Audio en Vivo',
      genre: genre || 'Electrónica / EDM',
      score: score || 0,
      duration: duration || 2,
      timestamp: new Date().toISOString(),
    };

    sessionHistory.unshift(sessionEntry);
    if (sessionHistory.length > 200) sessionHistory.pop();

    if (song) {
      songPlayCounts.set(song, (songPlayCounts.get(song) || 0) + 1);
    }
    if (genre) {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }

    // Broadcast to Admin Dashboards
    const metrics = computeDashboardMetrics();
    io.emit('admin-update', sessionEntry);
    io.emit('admin:metrics_update', metrics);
  });

  // 2. Client Real Performance Reporting
  socket.on('perf:client', (data) => {
    if (data && typeof data.fps === 'number') {
      latestClientMetrics = {
        fps: Math.max(0, Math.min(240, Math.round(data.fps))),
        latencyMs: typeof data.latencyMs === 'number' ? Math.max(0, Math.round(data.latencyMs)) : latestClientMetrics.latencyMs,
        audioProcessingTimeMs:
          typeof data.audioProcessingTimeMs === 'number'
            ? Number(data.audioProcessingTimeMs.toFixed(3))
            : latestClientMetrics.audioProcessingTimeMs,
        gpuName: data.gpuName || latestClientMetrics.gpuName,
        performanceMode: data.performanceMode || latestClientMetrics.performanceMode,
        lastReportTime: Date.now(),
      };
    }
  });

  // 3. Ping / Pong Latency Measurement
  socket.on('ping:client', (clientTimestamp, callback) => {
    if (typeof callback === 'function') {
      callback(clientTimestamp);
    }
  });

  // 4. User Active notification
  socket.on('user-active', (userId) => {
    const uid = userId || socket.id;
    activeUsers.set(uid, socket.id);
    io.emit('active-users-count', activeUsers.size);
    io.emit('admin:metrics_update', computeDashboardMetrics());
  });

  // 5. Client Join
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
    activeUsers.set(session.userId, socket.id);

    if (data?.currentTrack) {
      const key = `${data.currentTrack} - ${data.artist || 'Auralis'}`;
      songPlayCounts.set(key, (songPlayCounts.get(key) || 0) + 1);
    }
    if (data?.genre) {
      genreCounts.set(data.genre, (genreCounts.get(data.genre) || 0) + 1);
    }

    io.emit('active-users-count', activeUsers.size);
    io.emit('admin:metrics_update', computeDashboardMetrics());
  });

  // 6. Client Live Stats Update
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

      if (data.genre && data.genre !== session.genre) {
        genreCounts.set(data.genre, (genreCounts.get(data.genre) || 0) + 1);
      }

      io.emit('admin:metrics_update', computeDashboardMetrics());
    }
  });

  // 7. Admin Subscribe
  socket.on('admin:subscribe', () => {
    socket.emit('admin:metrics_update', computeDashboardMetrics());
  });

  // 8. Client Disconnect
  socket.on('disconnect', () => {
    activeSessions.delete(socket.id);
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    io.emit('active-users-count', activeUsers.size);
    io.emit('admin:metrics_update', computeDashboardMetrics());
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`[Auralis Backend] Servidor seguro corriendo en http://localhost:${PORT}`);
  console.log(`[Auralis Backend] Socket.io listo para telemetría y métricas en tiempo real.`);
});
