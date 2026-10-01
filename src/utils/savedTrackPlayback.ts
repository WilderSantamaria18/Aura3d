import type { Track } from '../types/audio';

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
  const excluded = new Set(excludedIds.map((id) => id.replace(/^yt_/, '')));
  return candidates
    .filter(
      (candidate) =>
        candidate?.id &&
        candidate.type !== 'playlist' &&
        !excluded.has(candidate.id.replace(/^yt_/, ''))
    )
    .map((candidate) => ({ candidate, score: scoreYouTubeCandidate(candidate, track) }))
    .sort((a, b) => b.score - a.score)[0]?.candidate;
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

export function invalidateCachedYouTubeCandidate(track: Track): void {
  const cache = readResolutionCache();
  delete cache[getResolutionCacheKey(track)];
  writeResolutionCache(cache);
}

export async function resolveSavedTrackCandidate(
  track: Track,
  options: { signal?: AbortSignal; excludedIds?: string[]; forceRefresh?: boolean } = {}
): Promise<YouTubePlaybackCandidate> {
  const excludedIds = options.excludedIds || [];
  const cached = !options.forceRefresh ? getCachedYouTubeCandidate(track) : undefined;
  if (cached && !excludedIds.includes(cached.id) && !excludedIds.includes(`yt_${cached.id}`)) {
    return cached;
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
  const candidate = selectBestYouTubeCandidate(data.results || [], track, excludedIds);
  if (!candidate) throw new Error(`No encontramos “${track.title}” en YouTube.`);
  cacheYouTubeCandidate(track, candidate);
  return candidate;
}

export function createTrackFromYouTubeCandidate(
  candidate: YouTubePlaybackCandidate,
  savedTrack: Track
): Track {
  const videoId = candidate.id.replace(/^yt_/, '');
  return {
    ...savedTrack,
    id: savedTrack.id.startsWith('yt_') ? `yt_${videoId}` : savedTrack.id,
    title: candidate.title || savedTrack.title,
    artist: candidate.artist || savedTrack.artist,
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
