import type { Track } from '../types/audio';
import { isGenericArtist } from './musicMetadata';

export interface YouTubePlaybackCandidate {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  thumbnail?: string;
  type?: 'video' | 'playlist';
}

interface CachedResolution {
  candidate: YouTubePlaybackCandidate;
  savedAt: number;
}

type ResolutionCache = Record<string, CachedResolution>;

const CACHE_KEY = 'auralis_youtube_resolution_v1';
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 200;

const GENERIC_ARTISTS = new Set([
  'archivo local',
  'auralis',
  'aura3d',
  'youtube stream',
  'artista de youtube',
  'artista desconocido',
]);

export function canPlaySavedTrackDirectly(track: Track): boolean {
  if (track.file || track.youtubeId || track.id.startsWith('yt_')) return true;
  if (track.sourceType === 'spotify') return false;
  return Boolean(track.url && !track.url.startsWith('blob:'));
}

export function buildSavedTrackSearchQuery(track: Track): string {
  const title = track.title.trim();
  const artist = track.artist.trim();
  const includeArtist = artist && !GENERIC_ARTISTS.has(artist.toLowerCase());
  return [title, includeArtist ? artist : '', 'audio'].filter(Boolean).join(' ');
}

export function normalizeTrackText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(official|video|audio|lyrics?|hd|4k|remaster(?:ed)?)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenCoverage(source: string, target: string): number {
  const targetTokens = new Set(normalizeTrackText(target).split(' ').filter((token) => token.length > 1));
  if (targetTokens.size === 0) return 0;
  const sourceTokens = new Set(normalizeTrackText(source).split(' '));
  let matches = 0;
  targetTokens.forEach((token) => {
    if (sourceTokens.has(token)) matches += 1;
  });
  return matches / targetTokens.size;
}

export function scoreYouTubeCandidate(candidate: YouTubePlaybackCandidate, track: Track): number {
  const candidateTitle = normalizeTrackText(candidate.title || '');
  const targetTitle = normalizeTrackText(track.title);
  const combinedCandidate = `${candidate.title || ''} ${candidate.artist || ''}`;
  let score = tokenCoverage(candidate.title || '', track.title) * 80;

  if (candidateTitle === targetTitle) score += 45;
  else if (candidateTitle.includes(targetTitle) || targetTitle.includes(candidateTitle)) score += 24;

  if (track.artist && !GENERIC_ARTISTS.has(track.artist.toLowerCase())) {
    score += tokenCoverage(combinedCandidate, track.artist) * 45;
  }

  if (/official audio|provided to youtube|topic\b|official video/i.test(combinedCandidate)) score += 18;
  if (/karaoke|instrumental|cover\b|reaction|tutorial/i.test(combinedCandidate)) score -= 55;
  if (/slowed|reverb|nightcore|sped up|remix|mashup/i.test(combinedCandidate)) score -= 30;
  if (/\b(?:live|concert|mix|playlist|compilation|full album|1 hour|2 hours)\b/i.test(combinedCandidate)) {
    score -= 22;
  }

  if (track.duration > 0 && candidate.duration && candidate.duration > 0) {
    const differenceRatio = Math.abs(candidate.duration - track.duration) / track.duration;
    score += Math.max(-35, 22 - differenceRatio * 70);
  } else if (candidate.duration && candidate.duration > 900) {
    score -= 30;
  }

  return score;
}

export function selectBestYouTubeCandidate(
  candidates: YouTubePlaybackCandidate[],
  track: Track,
  excludedIds: string[] = []
): YouTubePlaybackCandidate | undefined {
  return rankYouTubeCandidates(candidates, track, excludedIds)[0];
}

/**
 * Ordena los candidatos por afinidad y descarta los vetados.
 *
 * El pipeline de fallback necesita **la lista**, no sólo el mejor: así puede probar el
 * candidato 2, 3… sin repetir la búsqueda y sin volver a caer en uno que ya falló.
 */
export function rankYouTubeCandidates(
  candidates: YouTubePlaybackCandidate[],
  track: Track,
  excludedIds: string[] = []
): YouTubePlaybackCandidate[] {
  const excluded = new Set(excludedIds.map((id) => id.replace(/^yt_/, '')));
  return candidates
    .filter(
      (candidate) =>
        candidate?.id &&
        candidate.type !== 'playlist' &&
        !excluded.has(candidate.id.replace(/^yt_/, ''))
    )
    .map((candidate) => ({ candidate, score: scoreYouTubeCandidate(candidate, track) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate);
}

export function getResolutionCacheKey(track: Track): string {
  return `${normalizeTrackText(track.title)}::${normalizeTrackText(track.artist)}`;
}

function readResolutionCache(): ResolutionCache {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ResolutionCache) : {};
  } catch {
    return {};
  }
}

function writeResolutionCache(cache: ResolutionCache): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const entries = Object.entries(cache)
      .sort(([, a], [, b]) => b.savedAt - a.savedAt)
      .slice(0, CACHE_LIMIT);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // La reproducción debe continuar aunque el almacenamiento esté lleno o bloqueado.
  }
}

export function getCachedYouTubeCandidate(track: Track): YouTubePlaybackCandidate | undefined {
  const cache = readResolutionCache();
  const key = getResolutionCacheKey(track);
  const entry = cache[key];
  if (!entry) return undefined;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    delete cache[key];
    writeResolutionCache(cache);
    return undefined;
  }
  return entry.candidate;
}

export function cacheYouTubeCandidate(track: Track, candidate: YouTubePlaybackCandidate): void {
  const cache = readResolutionCache();
  cache[getResolutionCacheKey(track)] = { candidate, savedAt: Date.now() };
  writeResolutionCache(cache);
}

/**
 * Sólo se cachea un candidato **cuando se confirma que reproduce** (`confirmYouTubeCandidate`).
 * Antes se cacheaba al resolverlo, así que un vídeo no incrustable quedaba guardado 90 días.
 */
export function confirmYouTubeCandidate(track: Track, candidate: YouTubePlaybackCandidate): void {
  cacheYouTubeCandidate(track, candidate);
}

export function invalidateCachedYouTubeCandidate(track: Track): void {
  const cache = readResolutionCache();
  delete cache[getResolutionCacheKey(track)];
  writeResolutionCache(cache);
}

/**
 * Candidatos utilizables para una pista, ordenados por afinidad.
 * Empieza por la resolución cacheada (si sigue siendo válida) y, si no, busca en YouTube.
 *
 * `skipSearch` permite usar sólo el candidato ya confirmado: si el vídeo guardado funciona
 * no se gasta ninguna búsqueda; si falla, el pipeline vuelve a llamar (sin `skipSearch`) y
 * entonces sí se buscan alternativas.
 */
export async function resolveSavedTrackCandidates(
  track: Track,
  options: {
    signal?: AbortSignal;
    excludedIds?: string[];
    forceRefresh?: boolean;
    skipSearch?: boolean;
  } = {}
): Promise<YouTubePlaybackCandidate[]> {
  const excludedIds = options.excludedIds || [];
  const cached = !options.forceRefresh ? getCachedYouTubeCandidate(track) : undefined;
  const cachedUsable =
    cached && !excludedIds.includes(cached.id) && !excludedIds.includes(`yt_${cached.id}`) ? cached : undefined;

  if (options.skipSearch && cachedUsable) {
    return [cachedUsable];
  }

  const response = await fetch(
    `/api/youtube/search?q=${encodeURIComponent(buildSavedTrackSearchQuery(track))}&type=video`,
    { signal: options.signal }
  );
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('YouTube recibió demasiadas búsquedas. Espera un momento e inténtalo otra vez.');
    }
    throw new Error('YouTube no respondió a la búsqueda. Inténtalo de nuevo.');
  }

  const data = (await response.json()) as { results?: YouTubePlaybackCandidate[] };
  const ranked = rankYouTubeCandidates(data.results || [], track, excludedIds);

  if (!cachedUsable) return ranked;

  // El candidato ya confirmado va primero; el resto queda como respaldo por si falla.
  return [cachedUsable, ...ranked.filter((item) => item.id !== cachedUsable.id)];
}

export async function resolveSavedTrackCandidate(
  track: Track,
  options: { signal?: AbortSignal; excludedIds?: string[]; forceRefresh?: boolean } = {}
): Promise<YouTubePlaybackCandidate> {
  const candidates = await resolveSavedTrackCandidates(track, options);
  const candidate = candidates[0];
  if (!candidate) throw new Error(`No encontramos “${track.title}” en YouTube.`);
  return candidate;
}

/**
 * Convierte un candidato de YouTube en la pista reproducible.
 *
 * Dos reglas de metadatos (causa de las letras mal buscadas):
 *  - El **artista original de la pista nunca se pisa con el canal**: el canal se guarda en
 *    `uploader` y sólo se usa como artista si no había ninguno aprovechable.
 *  - El **id de la pista se mantiene** aunque cambie el vídeo: así la identidad es estable
 *    entre reintentos de fallback y el pipeline puede acumular los vídeos que ya fallaron.
 */
export function createTrackFromYouTubeCandidate(
  candidate: YouTubePlaybackCandidate,
  savedTrack: Track
): Track {
  const videoId = candidate.id.replace(/^yt_/, '');
  const savedArtist = (savedTrack.artist || '').trim();
  const keepSavedArtist = Boolean(savedArtist) && !isGenericArtist(savedArtist);
  return {
    ...savedTrack,
    id: savedTrack.id,
    title: candidate.title || savedTrack.title,
    artist: keepSavedArtist ? savedArtist : candidate.artist || savedTrack.artist,
    uploader: candidate.artist || savedTrack.uploader,
    duration: candidate.duration || savedTrack.duration || 210,
    sourceType: 'youtube',
    youtubeId: videoId,
    isIframePlayback: undefined,
    url: undefined,
    file: undefined,
    coverUrl:
      candidate.thumbnail ||
      savedTrack.coverUrl ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    addedAt: savedTrack.addedAt || Date.now(),
    isFavorite: true,
  };
}

export function replaceResolvedFavorite(favorites: Track[], original: Track, resolved: Track): Track[] {
  const result: Track[] = [];
  let inserted = false;

  for (const track of favorites) {
    const isOriginal =
      track.id === original.id ||
      (Boolean(original.youtubeId) && track.youtubeId === original.youtubeId);
    const isResolvedDuplicate =
      track.id === resolved.id ||
      (Boolean(resolved.youtubeId) && track.youtubeId === resolved.youtubeId);

    if (isOriginal) {
      if (!inserted) {
        result.push(resolved);
        inserted = true;
      }
    } else if (!isResolvedDuplicate) {
      result.push(track);
    }
  }

  if (!inserted) result.push(resolved);
  return result;
}
