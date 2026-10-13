/**
 * Normalización centralizada de metadatos musicales.
 *
 * Problema que resuelve: las pistas que llegan desde YouTube traen el título del vídeo
 * («Callaíta - 432 hertz», «X (Official Video) [HD]») y el **canal** en lugar del artista
 * («LatinHype», «sweetblue.»). Consultar APIs de letras con esos datos produce 404 masivos
 * y variantes absurdas (`track_name=432 hertz`).
 *
 * Todo lo de este archivo es puro y determinista: se puede testear sin red ni DOM.
 */

export type ArtistSource = 'track' | 'parsed' | 'uploader' | 'unknown';

/** Confianza en el artista: decide si se usa en la consulta o se busca sólo por título. */
export type ArtistConfidence = 'high' | 'medium' | 'low';

export interface MusicMetadataInput {
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  duration?: number | null;
  uploader?: string | null;
}

export interface NormalizedMusicMetadata {
  /** Título limpio, sin decoradores de vídeo de YouTube. */
  title: string;
  /** Título tal como llegó (necesario para decidir si una versión es «slowed», etc.). */
  rawTitle: string;
  /** Artista fiable. Cadena vacía cuando no hay ninguno creíble. */
  artist: string;
  /** Artista tal como llegó, por si era el canal del vídeo. */
  rawArtist: string;
  /** Canal/uploader del vídeo, tal cual, para mostrarlo por separado. */
  uploader?: string;
  album?: string;
  duration?: number;
  /** true si la duración es una medida real y no un marcador de posición. */
  durationTrusted: boolean;
  artistSource: ArtistSource;
  /** high = metadatos de la pista · medium = deducido del título · low = sólo el canal. */
  artistConfidence: ArtistConfidence;
  titleSource: 'track' | 'parsed';
  /** Clave normalizada `artista::título` para cachés. */
  cacheKey: string;
}

/**
 * Duraciones que el código usa como marcador cuando no conoce la real
 * (`FALLBACK_YOUTUBE_DURATION = 210`, `next.duration || 180`).
 */
export const PLACEHOLDER_DURATIONS: ReadonlySet<number> = new Set([180, 210]);

/** Artistas de relleno: no aportan nada a una búsqueda de letras. */
export const GENERIC_ARTISTS: ReadonlySet<string> = new Set([
  'archivo local',
  'auralis',
  'aura3d',
  'youtube stream',
  'artista de youtube',
  'artista desconocido',
  'desconocido',
  'unknown artist',
  'varios artistas',
  'various artists',
]);

/**
 * Canales de YouTube observados que suben música ajena (no son el artista).
 * El resto se detecta con la heurística de `isUploaderLikeArtist`.
 */
export const KNOWN_UPLOADER_CHANNELS: ReadonlySet<string> = new Set([
  'latinhype',
  'sweetblue',
  'sweetblue.',
  'trap nation',
  'ncs',
  'nocopyrightsounds',
  'proximity',
  'mrSuicideSheep'.toLowerCase(),
  'the sound you need',
  'majestic casual',
  'chill nation',
  'selected.',
  'mrrevillz',
  'latin music',
  'musica latin',
]);

/** Palabras que, por sí solas, convierten un segmento en decoración. */
const DECORATOR_TOKENS: ReadonlySet<string> = new Set([
  // formatos y soportes
  'official', 'oficial', 'video', 'videos', 'videoclip', 'clip', 'clips', 'mv', 'music',
  'audio', 'audios', 'lyric', 'lyrics', 'letra', 'letras', 'visualizer', 'visualiser',
  'subtitulado', 'subtitulada', 'subtitles', 'traduccion', 'traducido', 'translation',
  'version', 'tema', 'full', 'completo', 'complete',
  // calidad
  'hd', 'hq', 'uhd', '4k', '8k', '1080p', '720p', 'remaster', 'remastered', 'remasterizado',
  'quality', 'calidad',
  // directo
  'live', 'vivo', 'directo', 'streaming', 'stream',
  // variaciones de tempo/tono (decoran el título del vídeo)
  'slowed', 'reverb', 'sped', 'speed', 'up', 'down', 'nightcore', 'slowedreverb',
  // colaboraciones
  'feat', 'ft', 'featuring', 'with', 'con', 'prod', 'produced', 'remix', 'mix',
  // ruido de plataforma
  'tiktok', 'viral', 'trending', 'shorts', 'audioonly', 'only',
]);

/** `feat.` / `ft.` / `con` al principio de un segmento entre paréntesis. */
const FEAT_PREFIX = /^(?:feat\.?|ft\.?|featuring|with|con|prod\.?|produced\s+by)\b/i;

const FREQUENCY_PATTERN = /\b\d{2,3}\s?(?:hz|hertz|khz)\b/gi;
const SEPARATOR_PATTERN = /\s+(?:[-–—|·•/]|\/\/)\s+/;

const normalizeSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** Quita acentos, signos y mayúsculas: sólo para comparar y para construir claves. */
export function normalizeKeyPart(value: string): string {
  return normalizeSpaces(
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
  );
}

export function isGenericArtist(artist: string): boolean {
  const key = normalizeKeyPart(artist);
  if (!key) return true;
  return GENERIC_ARTISTS.has(key);
}

/** Canal tipo `<Artista> - Topic`: YouTube lo genera a partir de los metadatos del sello. */
export function artistFromTopicChannel(name: string): string | undefined {
  const match = (name || '').match(/^(.*?)\s*[-–—]\s*Topic$/i);
  const candidate = match?.[1]?.trim();
  if (!candidate || isGenericArtist(candidate)) return undefined;
  return candidate;
}

/**
 * ¿El nombre parece un canal/sello y no el artista?
 * Heurística conservadora: nombres terminados en punto o con sufijo de canal.
 * Un falso positivo sólo hace que busquemos la letra por título o con el artista
 * deducido del título, que es preferible a consultar con el canal.
 */
export function isUploaderLikeArtist(name: string): boolean {
  const raw = (name || '').trim();
  if (!raw) return false;
  if (artistFromTopicChannel(raw)) return false; // «X - Topic» SÍ es el artista
  const key = normalizeKeyPart(raw);
  if (!key) return false;
  if (KNOWN_UPLOADER_CHANNELS.has(key)) return true;
  if (/vevo$/i.test(key.replace(/\s+/g, ''))) return true;
  if (raw.endsWith('.')) return true;
  // Usuario/identificador: una sola palabra con dígitos («Guad4W», «Blink182»).
  // Se prefiere no usar el canal como artista: se buscará por título.
  if (!raw.includes(' ') && !raw.includes('-') && raw.length >= 4 && /\d/.test(raw)) return true;
  return /(records?|music|musik|tv|hype|nation|label|entertainment|official|channel|vibes|sounds?|beats?|media|studio|group|crew|collective|network|radio|playlist|clips|videos|discos|productions?)$/i.test(
    key
  );
}

/** ¿El segmento está compuesto sólo de decoración («432 hertz», «Official Video HD»)? */
export function isDecoratorSegment(segment: string): boolean {
  const withoutFrequency = (segment || '').replace(FREQUENCY_PATTERN, ' ');
  const withoutSymbols = withoutFrequency.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (!withoutSymbols) return true; // sólo números, años o signos
  const tokens = withoutSymbols.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  if (FEAT_PREFIX.test(withoutSymbols)) return true;
  return tokens.every((token) => DECORATOR_TOKENS.has(token) || /^\d+$/.test(token));
}

/**
 * Limpia el título de un vídeo de YouTube conservando la información musical.
 *
 * `Callaíta - 432 hertz` → `Callaíta`
 * `Bad Bunny - Callaíta (Official Video) [HD]` → `Bad Bunny - Callaíta`
 * `MOJABI GHOST (Slowed + Reverb)` → `MOJABI GHOST`
 */
export function cleanMusicTitle(raw: string): string {
  const original = normalizeSpaces((raw || '').replace(/\s*\n\s*/g, ' '));
  if (!original) return '';

  let value = original;

  // «Provided to YouTube by …» ocupa el título entero en las pistas de Content ID.
  if (/^provided to youtube by\b/i.test(value)) return '';

  // 1. Quita paréntesis/corchetes decorativos o de colaboración.
  const bracketPattern = /[([{【]([^)\]}】]*)[)\]】}]/g;
  let previous = '';
  while (previous !== value) {
    previous = value;
    value = value.replace(bracketPattern, (whole, inner: string) => {
      const content = inner.trim();
      if (!content) return ' ';
      if (FEAT_PREFIX.test(content)) return ' ';
      return isDecoratorSegment(content) ? ' ' : whole;
    });
  }

  // 2. Quita frecuencias («432 hertz», «528 Hz»).
  value = value.replace(FREQUENCY_PATTERN, ' ');

  // 3. Quita segmentos finales de decoración separados por guiones o barras.
  const segments = value
    .split(SEPARATOR_PATTERN)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  while (segments.length > 1 && isDecoratorSegment(segments[segments.length - 1])) {
    segments.pop();
  }
  value = segments.join(' - ');

  // 4. Quita decoración final sin separador («Callaíta Official Video»).
  let stripped = '';
  while (stripped !== value) {
    stripped = value;
    value = value
      .replace(
        /[\s\-–—|]*(?:official\s+video|video\s+oficial|official\s+audio|audio\s+oficial|official\s+music\s+video|lyric\s+video|video\s+con\s+letra|visuali[sz]er|slowed\s*\+\s*reverb|slowed|reverb|sped\s+up|speed\s+up|nightcore|remaster(?:ed|izado)?|full\s+album|letra|lyrics?|hd|hq|uhd|4k|8k)\s*$/gi,
        ''
      )
      .trim();
  }

  // 5. Limpieza final de separadores huérfanos y espacios.
  value = normalizeSpaces(
    value
      .replace(/^[\s\-–—|·•/,;]+/, '')
      .replace(/[\s\-–—|·•/,;]+$/, '')
      .replace(/\s*([-–—|·•])\s*\1+\s*/g, ' $1 ')
  );

  // Nunca devolver vacío ni destruir el título si la limpieza se pasó de agresiva.
  if (value.length < 2) return original;
  return value;
}

/**
 * Separa «Artista - Título» sin destruir información.
 *
 * Sólo divide cuando el lado derecho **no** es decoración (`Callaíta - 432 hertz`
 * NO se divide: 432 hertz es un decorador).
 */
export function splitArtistFromTitle(
  rawTitle: string,
  knownArtist?: string
): { title: string; artist?: string } {
  const raw = normalizeSpaces(rawTitle || '');
  if (!raw) return { title: '' };

  const match = raw.match(/^(.*?)\s+[-–—]\s+(.*)$/);
  if (!match) return { title: raw };

  const left = match[1].trim();
  const right = match[2].trim();
  if (!left || !right) return { title: raw };

  const known = knownArtist ? normalizeKeyPart(knownArtist) : '';
  if (known) {
    const leftKey = normalizeKeyPart(left);
    const rightKey = normalizeKeyPart(right);
    if (leftKey === known || leftKey.endsWith(` ${known}`) || leftKey.startsWith(`${known} `)) {
      return { title: right };
    }
    if (rightKey === known || rightKey.endsWith(` ${known}`) || rightKey.startsWith(`${known} `)) {
      return { title: left };
    }
    return { title: raw };
  }

  if (!isDecoratorSegment(left) && !isDecoratorSegment(right)) {
    return { title: right, artist: left };
  }
  return { title: raw };
}

export function isTrustedDuration(duration?: number | null): boolean {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return false;
  return !PLACEHOLDER_DURATIONS.has(Math.round(duration));
}

/** Clave estable de caché para letras: `artista::título` normalizados. */
export function lyricsCacheKey(artist: string, title: string): string {
  return `${normalizeKeyPart(artist)}::${normalizeKeyPart(title)}`;
}

export function normalizeMusicMetadata(input: MusicMetadataInput): NormalizedMusicMetadata {
  const rawTitle = normalizeSpaces(input.title || '');
  const rawArtist = normalizeSpaces(input.artist || '');
  const rawUploader = normalizeSpaces(input.uploader || '');
  const album = normalizeSpaces(input.album || '') || undefined;
  const duration =
    typeof input.duration === 'number' && Number.isFinite(input.duration) && input.duration > 0
      ? Math.round(input.duration)
      : undefined;

  // El canal puede venir en `uploader` o (como hoy) directamente en `artist`.
  const topicFromArtist = artistFromTopicChannel(rawArtist);
  const topicFromUploader = artistFromTopicChannel(rawUploader);
  const topicArtist = topicFromArtist || topicFromUploader;
  const artistLooksLikeChannel = Boolean(rawArtist) && (isGenericArtist(rawArtist) || isUploaderLikeArtist(rawArtist));
  const artistIsMeaningful = Boolean(rawArtist) && !artistLooksLikeChannel && !topicFromArtist;

  const split = splitArtistFromTitle(rawTitle, artistIsMeaningful ? rawArtist : topicFromArtist);
  const cleanedTitle = cleanMusicTitle(split.title) || cleanMusicTitle(rawTitle) || rawTitle;

  let artist = '';
  let artistSource: ArtistSource = 'unknown';
  let artistConfidence: ArtistConfidence = 'low';
  if (topicFromArtist) {
    // «X - Topic» es el canal oficial del sello: el nombre ES el artista, dato fiable.
    artist = topicFromArtist;
    artistSource = 'uploader';
    artistConfidence = 'high';
  } else if (artistIsMeaningful) {
    artist = rawArtist;
    artistSource = 'track';
    artistConfidence = 'high';
  } else if (split.artist) {
    artist = cleanMusicTitle(split.artist) || split.artist;
    artistSource = 'parsed';
    artistConfidence = 'medium';
  } else if (topicFromUploader) {
    artist = topicFromUploader;
    artistSource = 'uploader';
    artistConfidence = 'high';
  } else if (rawUploader && !isUploaderLikeArtist(rawUploader) && !isGenericArtist(rawUploader)) {
    artist = rawUploader;
    artistSource = 'uploader';
    artistConfidence = 'medium';
  }

  // `uploader` conserva el nombre real del canal, aunque haya llegado en el campo `artist`.
  const uploader = rawUploader || (topicFromArtist ? rawArtist : undefined) || undefined;

  return {
    title: cleanedTitle,
    rawTitle,
    artist,
    rawArtist,
    uploader,
    album,
    duration,
    durationTrusted: isTrustedDuration(duration),
    artistSource,
    artistConfidence,
    titleSource: split.title !== rawTitle || split.artist ? 'parsed' : 'track',
    cacheKey: lyricsCacheKey(artist, cleanedTitle),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
   Pipeline de consulta de letras: como máximo 4 pasos, sin explosión de variantes.
   ──────────────────────────────────────────────────────────────────────────── */

export type LyricsQueryStepId = 'lrclib-exact' | 'lrclib-simple' | 'lrclib-search' | 'lyrics-ovh';

export interface LyricsQueryStep {
  id: LyricsQueryStepId;
  label: string;
  url: string;
}

const LRCLIB_BASE = 'https://lrclib.net/api';
const LYRICS_OVH_BASE = 'https://api.lyrics.ovh/v1';

/**
 * Construye el pipeline acotado de búsqueda de letras:
 *   1. exacta (título + artista + álbum + duración fiables)
 *   2. simplificada (título + artista)
 *   3. search (título + artista)
 *   4. proveedor secundario (lyrics.ovh)
 *
 * Si el artista no es fiable (sólo tenemos el canal del vídeo), el pipeline **no**
 * consulta con él: busca por título (dos estrategias) en lugar de contaminar la
 * consulta con un nombre que no es el artista. Nunca devuelve más de 4 pasos.
 */
export function buildLyricsQueries(meta: NormalizedMusicMetadata): LyricsQueryStep[] {
  const steps: LyricsQueryStep[] = [];
  const title = meta.title.trim();
  if (!title) return steps;

  const artist = meta.artist.trim();
  const useArtist = Boolean(artist) && meta.artistConfidence !== 'low';
  const exactHasExtras = Boolean(meta.album) || meta.durationTrusted;

  if (!useArtist) {
    steps.push({
      id: 'lrclib-search',
      label: 'LRCLIB · búsqueda por título',
      url: `${LRCLIB_BASE}/search?q=${encodeURIComponent(title)}`,
    });
    steps.push({
      id: 'lrclib-simple',
      label: 'LRCLIB · filtro por título',
      url: `${LRCLIB_BASE}/search?${new URLSearchParams({ track_name: title }).toString()}`,
    });
    return steps.slice(0, 4);
  }

  if (exactHasExtras) {
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    if (meta.album) params.set('album_name', meta.album);
    if (meta.durationTrusted && meta.duration) params.set('duration', String(meta.duration));
    steps.push({
      id: 'lrclib-exact',
      label: 'LRCLIB · coincidencia exacta',
      url: `${LRCLIB_BASE}/get?${params.toString()}`,
    });
  }

  steps.push({
    id: 'lrclib-simple',
    label: 'LRCLIB · coincidencia simplificada',
    url: `${LRCLIB_BASE}/get?${new URLSearchParams({ track_name: title, artist_name: artist }).toString()}`,
  });
  steps.push({
    id: 'lrclib-search',
    label: 'LRCLIB · búsqueda',
    url: `${LRCLIB_BASE}/search?${new URLSearchParams({ track_name: title, artist_name: artist }).toString()}`,
  });
  steps.push({
    id: 'lyrics-ovh',
    label: 'Lyrics.ovh · respaldo',
    url: `${LYRICS_OVH_BASE}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
  });

  return steps.slice(0, 4);
}

/**
 * Pistas para las que no tiene sentido pedir letra sincronizada:
 * mixes/sesiones largas, phonk/montagem, versiones aceleradas o instrumentales.
 * Se evalúa sobre el título CRUDO (si el vídeo dice «slowed», esa versión no es la original).
 */
export function shouldSkipLyricsLookup(rawTitle: string, duration?: number | null): boolean {
  const title = (rawTitle || '').trim();
  if (!title) return false;
  if (typeof duration === 'number' && duration > 900) return true;
  if (/\b(mix|dj\s*set|session|sesi[oó]n|compilation|full\s+album|podcast|vol\.\s*\d+)\b/i.test(title)) return true;
  if (title.includes('|') || title.split(',').length > 3) return true;
  return /\b(montagem|phonk|instrumental|karaoke|type\s*beat|bass\s*boosted|drift\s*phonk|sped\s*up|speed\s*up|slowed|reverb|nightcore)\b/i.test(
    title
  );
}
