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
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ytdl from '@distube/ytdl-core';

const execFileAsync = promisify(execFile);

// Native .env support for Node.js 20.12+ / 24+
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if .env is absent
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// High-speed native audio caching directories
const YTDLP_BIN = path.resolve(__dirname, '..', '.cache', 'bin', 'yt-dlp.exe');
const AUDIO_CACHE_DIR = path.resolve(__dirname, '..', '.cache', 'audio');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}

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

// In-memory cache & queue for YouTube processing
const ytInfoCache = new Map();
const ytSearchCache = new Map();
const ytDownloadQueue = new Map();

// ── Fast YouTube Search Helper ─────────────────────────────────────────────
function parseDurationText(str) {
  if (!str) return 0;
  const parts = str.toString().trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

async function searchYouTubeDirect(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) return [];

    const parsed = JSON.parse(match[1]);
    const contents =
      parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results = [];
    for (const c of contents) {
      const vr = c.videoRenderer;
      if (vr && vr.videoId && !vr.videoId.startsWith('UC')) {
        const title = vr.title?.runs?.[0]?.text || 'Canción de YouTube';
        const artist =
          vr.ownerText?.runs?.[0]?.text ||
          vr.shortBylineText?.runs?.[0]?.text ||
          'Artista de YouTube';
        const durationSec = parseDurationText(vr.lengthText?.simpleText);
        const thumb =
          vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`;

        results.push({
          id: vr.videoId,
          title,
          artist,
          duration: durationSec,
          thumbnail: thumb,
          url: `https://www.youtube.com/watch?v=${vr.videoId}`,
        });
        if (results.length >= 10) break;
      }
    }
    return results;
  } catch (e) {
    clearTimeout(timeoutId);
    console.debug('[YouTube Direct Scrape skipped]:', e.message);
    return [];
  }
}

// ── YouTube Search Endpoint ────────────────────────────────────────────────
app.get(['/api/youtube/search', '/youtube/search'], async (req, res) => {
  try {
    const query = (req.query.q || req.query.query || '').toString().trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Término de búsqueda requerido (mínimo 2 caracteres)' });
    }

    const cacheKey = query.toLowerCase();
    if (ytSearchCache.has(cacheKey)) {
      return res.json({ results: ytSearchCache.get(cacheKey) });
    }

    // 1. Intento primario ultra-rápido: Direct Web Scraping (~400ms)
    let results = await searchYouTubeDirect(query);

    // 2. Intento secundario: Fallback a yt-dlp si el scraping directo no devolvió resultados
    if ((!results || results.length === 0) && fs.existsSync(YTDLP_BIN)) {
      try {
        const { stdout } = await execFileAsync(
          YTDLP_BIN,
          ['--dump-json', '--flat-playlist', '--no-playlist', `ytsearch8:${query}`],
          { timeout: 8000 }
        );
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
        results = [];
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            if (item && item.id && !item.id.startsWith('UC')) {
              results.push({
                id: item.id,
                title: item.title || 'Canción de YouTube',
                artist: item.uploader || item.channel || item.artist || 'Artista de YouTube',
                duration: Math.round(Number(item.duration) || 0),
                thumbnail:
                  item.thumbnail ||
                  item.thumbnails?.[item.thumbnails.length - 1]?.url ||
                  `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${item.id}`,
              });
            }
          } catch {}
        }
      } catch (dlpErr) {
        console.warn('[yt-dlp fallback search error]:', dlpErr.message);
      }
    }

    if (!results || results.length === 0) {
      // Retornar al menos sugerencia estructurada para enlace directo si nada respondió
      return res.json({
        results: [],
        message: 'No se encontraron resultados automáticos. Puedes pegar el enlace de YouTube directamente.',
      });
    }

    ytSearchCache.set(cacheKey, results);
    res.json({ results });
  } catch (err) {
    console.warn('[YouTube Search Error]', err.message);
    res.status(500).json({ error: 'Error al buscar en YouTube: ' + err.message, results: [] });
  }
});

// ── YouTube Related & Similar Tracks Endpoint ──────────────────────────────
app.get(['/api/youtube/related', '/youtube/related'], async (req, res) => {
  try {
    const videoId = (req.query.v || req.query.id || '').toString().trim();
    const artist = (req.query.artist || '').toString().trim();
    const title = (req.query.title || '').toString().trim();

    const cacheKey = `rel_${videoId || artist + '_' + title}`.toLowerCase();
    if (ytSearchCache.has(cacheKey)) {
      return res.json({ results: ytSearchCache.get(cacheKey) });
    }

    let results = [];

    // 1. Try to scrape YouTube watch page related videos (Up Next)
    if (videoId) {
      try {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const watchRes = await fetch(watchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
        });
        clearTimeout(timeoutId);

        if (watchRes.ok) {
          const html = await watchRes.text();
          const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            const secondaryItems =
              data.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results ||
              [];

            for (const item of secondaryItems) {
              const compact = item.compactVideoRenderer;
              if (compact && compact.videoId && compact.videoId !== videoId) {
                const itemTitle = compact.title?.simpleText || compact.title?.runs?.[0]?.text || '';
                const itemArtist =
                  compact.shortBylineText?.runs?.[0]?.text ||
                  compact.ownerText?.runs?.[0]?.text ||
                  artist ||
                  'Artista de YouTube';
                const dur = parseDurationText(compact.lengthText?.simpleText);
                const thumb =
                  compact.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                  `https://img.youtube.com/vi/${compact.videoId}/hqdefault.jpg`;

                results.push({
                  id: compact.videoId,
                  title: itemTitle,
                  artist: itemArtist,
                  duration: dur,
                  thumbnail: thumb,
                  url: `https://www.youtube.com/watch?v=${compact.videoId}`,
                });
                if (results.length >= 35) break;
              }
            }
          }
        }
      } catch (e) {
        console.debug('[YouTube Related Watch scrape fallback]:', e.message);
      }
    }

    // 2. Extraer paquetes de canciones populares y álbumes del artista para llegar a 50+ canciones
    if (artist && artist !== 'YouTube Stream' && artist !== 'Artista de YouTube') {
      const queries = [
        `${artist} canciones mejores exitos`,
        `${artist} top tracks audio`,
        `${artist} playlist album`,
        `${artist} mix radio similar`,
      ];
      for (const q of queries) {
        try {
          const searchRes = await searchYouTubeDirect(q);
          if (searchRes && searchRes.length > 0) {
            results.push(...searchRes);
          }
        } catch {}
      }
    } else if (title) {
      const cleanT = title.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      try {
        const searchRes = await searchYouTubeDirect(`${cleanT} canciones similares mix`);
        if (searchRes && searchRes.length > 0) results.push(...searchRes);
      } catch {}
    }

    // 3. Filter out duplicates of the current video and songs with the same title
    const cleanTitle = title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const uniqueMap = new Map();

    for (const r of results) {
      if (r.id === videoId) continue;
      const rTitleClean = r.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

      // Avoid same song / remix / live duplicate of current song
      if (cleanTitle.length > 3 && (rTitleClean === cleanTitle || (rTitleClean.includes(cleanTitle) && rTitleClean.length < cleanTitle.length + 8))) {
        continue;
      }

      if (!uniqueMap.has(r.id) && !uniqueMap.has(rTitleClean)) {
        uniqueMap.set(r.id, r);
        uniqueMap.set(rTitleClean, r);
      }
    }

    const finalResults = Array.from(new Set(uniqueMap.values())).slice(0, 60);
    ytSearchCache.set(cacheKey, finalResults);
    res.json({ results: finalResults });
  } catch (err) {
    console.warn('[YouTube Related Error]', err.message);
    res.status(500).json({ error: 'Error al obtener canciones similares: ' + err.message, results: [] });
  }
});

// ── YouTube Audio Extractor & Real-Time Streamer via yt-dlp ────────────────
app.get(['/api/youtube/info', '/youtube/info'], async (req, res) => {
  try {
    const videoId = (req.query.v || req.query.id || '').toString().trim();
    if (!videoId || !/^[a-zA-Z0-9_-]{8,20}$/.test(videoId)) {
      return res.status(400).json({ error: 'ID de video requerido y válido (ej: ?v=Bd9R1pFlOhQ)' });
    }

    if (ytInfoCache.has(videoId)) {
      return res.json(ytInfoCache.get(videoId));
    }

    if (!fs.existsSync(YTDLP_BIN)) {
      return res.status(503).json({ error: 'Motor de audio yt-dlp no encontrado en el servidor' });
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const { stdout } = await execFileAsync(YTDLP_BIN, [
      '--dump-json',
      '--no-playlist',
      url
    ], { timeout: 20000 });

    const details = JSON.parse(stdout);
    const info = {
      id: details.id || videoId,
      title: details.title || 'YouTube Track',
      artist: details.uploader || details.channel || details.artist || 'Artista de YouTube',
      duration: Math.round(Number(details.duration) || 0),
      thumbnail:
        details.thumbnail ||
        details.thumbnails?.[details.thumbnails.length - 1]?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };

    ytInfoCache.set(videoId, info);
    res.json(info);
  } catch (err) {
    console.warn('[YouTube Info Error]', err.message);
    res.status(500).json({ error: 'No se pudo obtener información del video: ' + err.message });
  }
});

function findCachedAudioFile(videoId) {
  try {
    // Si la descarga está activa en este momento, no leer archivos parciales
    if (ytDownloadQueue.has(videoId)) {
      return null;
    }

    const files = fs.readdirSync(AUDIO_CACHE_DIR);
    // Excluir terminaciones temporales o parciales
    const match = files.find(f => 
      f.startsWith(`${videoId}.`) && 
      !f.endsWith('.part') && 
      !f.endsWith('.ytdl') && 
      !f.endsWith('.temp')
    );
    if (match) {
      const fullPath = path.join(AUDIO_CACHE_DIR, match);
      const stat = fs.statSync(fullPath);
      // Debe ser un archivo de audio completo (mínimo 50KB)
      if (stat.size > 50000) {
        return { fullPath, size: stat.size, ext: path.extname(match).toLowerCase() };
      }
    }
  } catch (err) {
    console.warn('[Cache Search Error]', err.message);
  }
  return null;
}

app.get(['/api/youtube/stream', '/youtube/stream'], async (req, res) => {
  try {
    const videoId = (req.query.v || req.query.id || '').toString().trim();
    if (!videoId || !/^[a-zA-Z0-9_-]{8,20}$/.test(videoId)) {
      return res.status(400).json({ error: 'ID de video requerido y válido' });
    }

    if (!fs.existsSync(YTDLP_BIN)) {
      return res.status(503).json({ error: 'Motor de audio yt-dlp no encontrado en el servidor' });
    }

    let cached = findCachedAudioFile(videoId);

    if (!cached) {
      // Si ya se está descargando este video, esperar la descarga existente
      let downloadPromise = ytDownloadQueue.get(videoId);
      if (!downloadPromise) {
        console.log(`[YouTube Engine] Descargando stream nativo de audio para: ${videoId}...`);
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        downloadPromise = execFileAsync(YTDLP_BIN, [
          '-f', '251/140/ba',
          '--no-playlist',
          '--output', path.join(AUDIO_CACHE_DIR, `${videoId}.%(ext)s`),
          url
        ], { timeout: 60000 })
          .then(() => {
            ytDownloadQueue.delete(videoId);
            return findCachedAudioFile(videoId);
          })
          .catch((err) => {
            ytDownloadQueue.delete(videoId);
            throw err;
          });
        ytDownloadQueue.set(videoId, downloadPromise);
      }

      cached = await downloadPromise;
    }

    if (!cached) {
      return res.status(500).json({ error: 'No se pudo obtener el archivo de audio para este video' });
    }

    const { fullPath, size: fileSize, ext } = cached;
    let contentType = 'audio/webm; codecs=opus';
    if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';
    else if (ext === '.mp3') contentType = 'audio/mpeg';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept');
    res.setHeader('Content-Type', contentType);

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunksize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(fullPath, { start, end });
      req.on('close', () => stream.destroy());
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(fullPath);
      req.on('close', () => stream.destroy());
      stream.pipe(res);
    }
  } catch (err) {
    console.warn('[YouTube Stream Setup Error]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al inicializar el stream: ' + err.message });
    }
  }
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
  const userId = req.user.userId || req.user.id;
  let fullUser = null;
  for (const u of usersDb.values()) {
    if (u.id === userId || u.email === req.user.email) {
      fullUser = u;
      break;
    }
  }

  res.json({
    valid: true,
    user: fullUser
      ? {
          id: fullUser.id,
          username: fullUser.username,
          email: fullUser.email,
          role: fullUser.role,
          genres: fullUser.genres || [],
          createdAt: fullUser.createdAt,
        }
      : req.user,
  });
});

// Get User Profile (Protected)
app.get(['/auth/profile', '/api/auth/profile'], authMiddleware, (req, res) => {
  const userId = req.user.userId || req.user.id;
  for (const u of usersDb.values()) {
    if (u.id === userId || u.email === req.user.email) {
      return res.json({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        genres: u.genres || [],
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
      });
    }
  }
  res.status(404).json({ error: 'Usuario no encontrado' });
});

// Update User Profile (Protected)
app.put(['/auth/profile', '/api/auth/profile'], authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { username, genres, password } = req.body || {};

  let targetUser = null;
  for (const u of usersDb.values()) {
    if (u.id === userId || u.email === req.user.email) {
      targetUser = u;
      break;
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (username && typeof username === 'string' && username.trim().length >= 3) {
    targetUser.username = username.trim();
  }

  if (Array.isArray(genres)) {
    targetUser.genres = genres;
  }

  if (password && typeof password === 'string' && password.length >= 8) {
    targetUser.passwordHash = await bcrypt.hash(password, 12);
  }

  saveUsersToDisk();

  res.json({
    success: true,
    message: 'Perfil actualizado correctamente',
    user: {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
      genres: targetUser.genres || [],
    },
  });
});

// Delete Own Account (Protected)
app.delete(['/auth/profile', '/api/auth/profile'], authMiddleware, (req, res) => {
  const userId = req.user.userId || req.user.id;
  let targetKey = null;
  let targetUser = null;

  for (const [key, u] of usersDb.entries()) {
    if (u.id === userId || u.email === req.user.email) {
      targetKey = key;
      targetUser = u;
      break;
    }
  }

  if (!targetUser || !targetKey) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (targetUser.role === 'superadmin') {
    return res.status(403).json({ error: 'No se puede eliminar la cuenta principal de superadministrador' });
  }

  usersDb.delete(targetKey);
  saveUsersToDisk();

  res.json({ success: true, message: 'Cuenta eliminada exitosamente' });
});

// Guest / Client Anonymous Session Token for Instant Spotify Usage
app.post(['/auth/session', '/api/auth/session'], (req, res) => {
  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const token = jwt.sign(
    { userId, username: 'AuraUser', role: 'user' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({ token, userId });
});

// ═════════════════════════════════════════════════════════════════════════════
// ── 8. SPOTIFY OAUTH 2.0 (PKCE) & TRANSPORT CONTROLS (ZERO-TOKEN FRONTEND) ───
// ═════════════════════════════════════════════════════════════════════════════

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:4000/api/spotify/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

// In-Memory Spotify Auth Sessions: state -> { userId, codeVerifier, createdAt }
const spotifyAuthSessions = new Map();

// In-Memory Spotify Tokens: userId -> { accessToken, refreshToken, expiresAt }
// NEVER exposed to client/frontend
const userSpotifyTokens = new Map();

// Periodically clean up stale PKCE auth sessions (> 10 mins old)
setInterval(() => {
  const now = Date.now();
  for (const [state, sess] of spotifyAuthSessions.entries()) {
    if (now - sess.createdAt > 10 * 60 * 1000) {
      spotifyAuthSessions.delete(state);
    }
  }
}, 5 * 60 * 1000);

// PKCE Cryptographic Helpers using native node:crypto
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Retrieve a valid Spotify Access Token for the user.
 * Automatically refreshes using refresh_token when expired.
 */
async function getValidSpotifyToken(userId) {
  const tokenData = userSpotifyTokens.get(userId);
  if (!tokenData || !tokenData.refreshToken) {
    return null;
  }

  // Return existing token if valid for more than 45 seconds
  if (tokenData.accessToken && tokenData.expiresAt > Date.now() + 45000) {
    return tokenData.accessToken;
  }

  // Refresh token with Spotify API
  try {
    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refreshToken,
      client_id: SPOTIFY_CLIENT_ID,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (SPOTIFY_CLIENT_SECRET) {
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers,
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[Spotify Refresh Error]', response.status, errBody);
      if (response.status === 400 || response.status === 401) {
        userSpotifyTokens.delete(userId);
      }
      return null;
    }

    const data = await response.json();
    tokenData.accessToken = data.access_token;
    if (data.refresh_token) {
      tokenData.refreshToken = data.refresh_token;
    }
    tokenData.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    userSpotifyTokens.set(userId, tokenData);
    return tokenData.accessToken;
  } catch (err) {
    console.error('[Spotify Refresh Exception]', err);
    return null;
  }
}

/**
 * Execute an authenticated Spotify API request with automatic 401 retry on token expiry
 */
async function spotifyApiRequest(userId, endpoint, method = 'GET', body = null) {
  let token = await getValidSpotifyToken(userId);
  if (!token) {
    return { status: 401, data: { error: 'spotify_not_connected' } };
  }

  const exec = async (t) => {
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${t}`,
      },
    };
    if (body && (method === 'POST' || method === 'PUT')) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(`https://api.spotify.com/v1${endpoint}`, opts);
  };

  let res = await exec(token);

  // If 401, token might have been invalidated; force refresh and retry once
  if (res.status === 401) {
    const tokenData = userSpotifyTokens.get(userId);
    if (tokenData) tokenData.expiresAt = 0;
    token = await getValidSpotifyToken(userId);
    if (token) {
      res = await exec(token);
    }
  }

  if (res.status === 204) {
    return { status: 204, data: null };
  }

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { text };
  }
  return { status: res.status, data: parsed };
}

// ── Endpoints de Spotify ───────────────────────────────────────────────────

/**
 * POST /api/spotify/auth
 * Genera code_verifier y code_challenge (PKCE), guarda la sesión asociada al usuario y devuelve la auth URL
 */
app.post('/api/spotify/auth', authMiddleware, (req, res) => {
  if (!SPOTIFY_CLIENT_ID) {
    return res.status(500).json({
      error: 'SPOTIFY_CLIENT_ID no configurado en el servidor. Por favor define SPOTIFY_CLIENT_ID en variables de entorno.',
    });
  }

  const userId = req.user.userId || req.user.id;
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomBytes(16).toString('hex');

  spotifyAuthSessions.set(state, {
    userId,
    codeVerifier: verifier,
    createdAt: Date.now(),
  });

  const authUrl =
    'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: SPOTIFY_SCOPES,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    }).toString();

  res.json({ authUrl, state });
});

/**
 * GET /api/spotify/callback
 * Intercambia el código de autorización por access_token y refresh_token con el code_verifier
 */
app.get('/api/spotify/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('[Spotify Auth Callback Error]', error);
    return res.redirect(`${FRONTEND_URL}/?spotify_error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/?spotify_error=missing_code_or_state`);
  }

  const session = spotifyAuthSessions.get(String(state));
  if (!session) {
    return res.redirect(`${FRONTEND_URL}/?spotify_error=invalid_or_expired_state`);
  }

  spotifyAuthSessions.delete(String(state));

  try {
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: session.codeVerifier,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (SPOTIFY_CLIENT_SECRET) {
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers,
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[Spotify Token Exchange Error]', tokenRes.status, errBody);
      return res.redirect(`${FRONTEND_URL}/?spotify_error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();

    // Guardar tokens de forma segura en memoria/backend exclusivamente
    userSpotifyTokens.set(session.userId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000,
    });

    console.log(`[Spotify] Usuario autenticado correctamente: ${session.userId}`);
    res.redirect(`${FRONTEND_URL}/?spotify=connected`);
  } catch (err) {
    console.error('[Spotify Callback Exception]', err);
    res.redirect(`${FRONTEND_URL}/?spotify_error=server_exception`);
  }
});

/**
 * GET /api/spotify/status
 * Verifica si el usuario actual tiene conexión activa con Spotify
 */
app.get('/api/spotify/status', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.json({ isConnected: false });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const userId = user.userId || user.id;
    const isConnected = userSpotifyTokens.has(userId);
    return res.json({ isConnected });
  } catch {
    return res.json({ isConnected: false });
  }
});

/**
 * GET /api/spotify/current
 * Obtiene la pista actual en reproducción en Spotify
 */
app.get('/api/spotify/current', authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const result = await spotifyApiRequest(userId, '/me/player/currently-playing');

  if (result.status === 401) {
    return res.status(401).json({ error: 'Spotify no conectado o sesión expirada' });
  }

  if (result.status === 204 || !result.data || !result.data.item) {
    return res.status(204).end();
  }

  const { is_playing, progress_ms, item } = result.data;
  const artistsStr = item.artists ? item.artists.map((a) => a.name).join(', ') : 'Spotify Artist';
  const cover = item.album?.images?.[0]?.url || '';

  const trackInfo = {
    isPlaying: !!is_playing,
    is_playing: !!is_playing,
    progressMs: progress_ms || 0,
    progress_ms: progress_ms || 0,
    title: item.name || 'Sin título',
    artist: artistsStr,
    artists: artistsStr,
    album: {
      name: item.album?.name || '',
      images: item.album?.images || [],
    },
    duration: Math.round((item.duration_ms || 0) / 1000),
    duration_ms: item.duration_ms || 0,
    coverUrl: cover,
    spotifyUri: item.uri || '',
    spotify_uri: item.uri || '',
  };

  res.json(trackInfo);
});

/**
 * POST /api/spotify/play
 * Reanuda la reproducción en el dispositivo activo de Spotify
 */
app.post('/api/spotify/play', authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const result = await spotifyApiRequest(userId, '/me/player/play', 'PUT');
  if (result.status >= 200 && result.status < 300) {
    return res.json({ success: true });
  }
  res.status(result.status || 500).json(result.data || { error: 'Error al reanudar reproducción' });
});

/**
 * POST /api/spotify/pause
 * Pausa la reproducción en Spotify
 */
app.post('/api/spotify/pause', authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const result = await spotifyApiRequest(userId, '/me/player/pause', 'PUT');
  if (result.status >= 200 && result.status < 300) {
    return res.json({ success: true });
  }
  res.status(result.status || 500).json(result.data || { error: 'Error al pausar reproducción' });
});

/**
 * POST /api/spotify/next
 * Salta a la siguiente pista en Spotify
 */
app.post('/api/spotify/next', authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const result = await spotifyApiRequest(userId, '/me/player/next', 'POST');
  if (result.status >= 200 && result.status < 300) {
    return res.json({ success: true });
  }
  res.status(result.status || 500).json(result.data || { error: 'Error al pasar a la siguiente pista' });
});

/**
 * POST /api/spotify/previous
 * Vuelve a la pista anterior en Spotify
 */
app.post('/api/spotify/previous', authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const result = await spotifyApiRequest(userId, '/me/player/previous', 'POST');
  if (result.status >= 200 && result.status < 300) {
    return res.json({ success: true });
  }
  res.status(result.status || 500).json(result.data || { error: 'Error al volver a la pista anterior' });
});

/**
 * POST /api/spotify/seek
 * Busca una posición en milisegundos en Spotify
 */
app.post('/api/spotify/seek', authMiddleware, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { position_ms } = req.body || {};
  const pos = Math.max(0, Math.round(position_ms || 0));
  const result = await spotifyApiRequest(userId, `/me/player/seek?position_ms=${pos}`, 'PUT');
  if (result.status >= 200 && result.status < 300) {
    return res.json({ success: true, position_ms: pos });
  }
  res.status(result.status || 500).json(result.data || { error: 'Error al ajustar posición' });
});

/**
 * POST /api/spotify/disconnect
 * Cierra la sesión de Spotify en el servidor eliminando los tokens del usuario
 */
app.post('/api/spotify/disconnect', authMiddleware, (req, res) => {
  const userId = req.user.userId || req.user.id;
  userSpotifyTokens.delete(userId);
  res.json({ success: true });
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
