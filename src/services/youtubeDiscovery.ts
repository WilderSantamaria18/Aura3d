/**
 * Descubrimiento de música en YouTube: tipos de resultado, caché de búsquedas y pistas relacionadas.
 */
import type { Track } from '../types/audio';
import { isVercelDeployment } from '../utils/backendCapabilities';

// ── YouTube Search Cache ──────────────────────────────────────────────────────
export interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  url: string;
  type?: 'video' | 'playlist';
  videoCount?: string;
}

export const ytSearchCache = new Map<string, YouTubeSearchResult[]>();

// ── Fetch Related & Similar Tracks (Discovers different songs from same artist/genre) ──
export const fetchRelatedTracks = async (
  videoId: string,
  title = '',
  artist = '',
  duration = 0
): Promise<Track[]> => {
  const tracksMap = new Map<string, Track>();
  const cleanTitle = title.toLowerCase().replace(/[[({].*?[\])}]/g, '').trim();
  const isMixFormat =
    duration > 900 ||
    /mix|dj set|sesi[oó]n|1 hora|2 horas|1 hour|2 hours|live set|enganchado|compil/i.test(title);

  const addResultsToMap = (results: YouTubeSearchResult[]) => {
    for (const r of results) {
      if (!r || !r.id || r.id === videoId) continue;
      const rTitleClean = (r.title || '').toLowerCase().replace(/[[({].*?[\])}]/g, '').trim();
      if (cleanTitle.length > 3 && (rTitleClean === cleanTitle || (rTitleClean.includes(cleanTitle) && rTitleClean.length < cleanTitle.length + 8))) {
        continue;
      }

      // Descartar mixes de 1 hora si estamos reproduciendo una canción estándar de 3-4 min
      if (!isMixFormat) {
        if (
          r.duration > 720 ||
          /mix|dj set|sesi[oó]n|1 hora|2 horas|1 hour|2 hours|album completo|full album|compilation|enganchado|non stop|megamix/i.test(
            r.title
          )
        ) {
          continue;
        }
      }

      const uniqueKey = `yt_${r.id}`;
      const isVercel = isVercelDeployment();
      if (!tracksMap.has(uniqueKey)) {
        tracksMap.set(uniqueKey, {
          id: uniqueKey,
          title: r.title,
          artist: r.artist,
          duration: r.duration,
          sourceType: 'youtube' as const,
          youtubeId: r.id,
          isIframePlayback: isVercel,
          url: isVercel ? undefined : `/api/youtube/stream?v=${r.id}`,
          coverUrl: r.thumbnail,
          addedAt: Date.now(),
        });
      }
    }
  };

  try {
    const res = await fetch(
      `/api/youtube/related?v=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${Math.round(duration)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        addResultsToMap(data.results);
      }
    }
  } catch (e) {
    console.debug('[fetchRelatedTracks] Primary related fetch error:', e);
  }

  // Si tenemos menos de 50 canciones y conocemos el artista, enriquecer con búsquedas del mismo formato
  if (tracksMap.size < 50 && artist && artist !== 'YouTube Stream' && artist !== 'Artista de YouTube') {
    try {
      const queries = isMixFormat
        ? [
            `/api/youtube/search?q=${encodeURIComponent(`${artist} mix 1 hora`)}`,
            `/api/youtube/search?q=${encodeURIComponent(`${artist} dj set live session`)}`,
          ]
        : [
            `/api/youtube/search?q=${encodeURIComponent(`${artist} canciones mejores exitos singles`)}`,
            `/api/youtube/search?q=${encodeURIComponent(`${artist} canciones oficiales audio`)}`,
          ];

      const [searchRes1, searchRes2] = await Promise.all([
        fetch(queries[0]),
        fetch(queries[1]),
      ]);

      if (searchRes1.ok) {
        const d1 = await searchRes1.json();
        if (d1.results && Array.isArray(d1.results)) addResultsToMap(d1.results);
      }
      if (searchRes2.ok) {
        const d2 = await searchRes2.json();
        if (d2.results && Array.isArray(d2.results)) addResultsToMap(d2.results);
      }
    } catch {}
  }

  return Array.from(tracksMap.values()).slice(0, 75);
};
