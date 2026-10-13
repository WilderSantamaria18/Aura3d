import { describe, it, expect } from 'vitest';
import {
  buildLyricsQueries,
  cleanMusicTitle,
  isTrustedDuration,
  isUploaderLikeArtist,
  normalizeMusicMetadata,
  shouldSkipLyricsLookup,
  splitArtistFromTitle,
} from '../utils/musicMetadata';

describe('cleanMusicTitle · decoradores de vídeos de YouTube', () => {
  it('quita la frecuencia «432 hertz» del título', () => {
    expect(cleanMusicTitle('Callaíta - 432 hertz')).toBe('Callaíta');
    expect(cleanMusicTitle('Callaíta (432 Hz)')).toBe('Callaíta');
    expect(cleanMusicTitle('Callaíta 432hz')).toBe('Callaíta');
  });

  it('quita «Official Video», «Audio», «Lyrics», «HD» y «4K»', () => {
    expect(cleanMusicTitle('Bad Bunny - Callaíta (Official Video) [HD]')).toBe('Bad Bunny - Callaíta');
    expect(cleanMusicTitle('Tema - Official Audio')).toBe('Tema');
    expect(cleanMusicTitle('Tema (Lyric Video)')).toBe('Tema');
    expect(cleanMusicTitle('Tema - Video Oficial 4K')).toBe('Tema');
    expect(cleanMusicTitle('Tema [Letra]')).toBe('Tema');
    expect(cleanMusicTitle('Tema (Visualizer)')).toBe('Tema');
  });

  it('quita variaciones de tempo/timbre', () => {
    expect(cleanMusicTitle('MOJABI GHOST (Slowed + Reverb)')).toBe('MOJABI GHOST');
    expect(cleanMusicTitle('MOJABI GHOST - slowed reverb')).toBe('MOJABI GHOST');
    expect(cleanMusicTitle('Tema (Sped Up)')).toBe('Tema');
  });

  it('quita «feat.» entre paréntesis sin tocar el resto', () => {
    expect(cleanMusicTitle('Tema (feat. Otro Artista)')).toBe('Tema');
    expect(cleanMusicTitle('Tema [ft. Alguien] - Official Video')).toBe('Tema');
  });

  it('no destruye títulos legítimos ni devuelve vacío', () => {
    expect(cleanMusicTitle('Callaíta')).toBe('Callaíta');
    expect(cleanMusicTitle('Blinding Lights')).toBe('Blinding Lights');
    expect(cleanMusicTitle('432 hertz')).toBe('432 hertz'); // se rinde y devuelve el original
    expect(cleanMusicTitle('')).toBe('');
  });
});

describe('splitArtistFromTitle', () => {
  it('separa «Artista - Título» cuando el lado derecho no es decoración', () => {
    expect(splitArtistFromTitle('Bad Bunny - Callaíta')).toEqual({ title: 'Callaíta', artist: 'Bad Bunny' });
  });

  it('NO divide cuando el lado derecho es un decorador', () => {
    expect(splitArtistFromTitle('Callaíta - 432 hertz')).toEqual({ title: 'Callaíta - 432 hertz' });
    expect(splitArtistFromTitle('Callaíta - Official Video')).toEqual({ title: 'Callaíta - Official Video' });
  });

  it('quita el prefijo del artista cuando ya lo conocemos', () => {
    expect(splitArtistFromTitle('Bad Bunny - Callaíta', 'Bad Bunny')).toEqual({ title: 'Callaíta' });
  });
});

describe('isUploaderLikeArtist · el canal no es el artista', () => {
  it('reconoce canales conocidos, handles y sufijos de sello', () => {
    expect(isUploaderLikeArtist('LatinHype')).toBe(true);
    expect(isUploaderLikeArtist('sweetblue.')).toBe(true);
    expect(isUploaderLikeArtist('Guad4W')).toBe(true);
    expect(isUploaderLikeArtist('Trap Nation')).toBe(true);
    expect(isUploaderLikeArtist('Cualquiera Records')).toBe(true);
  });

  it('no marca artistas reales ni canales «- Topic»', () => {
    expect(isUploaderLikeArtist('Bad Bunny')).toBe(false);
    expect(isUploaderLikeArtist('Dua Lipa')).toBe(false);
    expect(isUploaderLikeArtist('Bad Bunny - Topic')).toBe(false);
  });
});

describe('normalizeMusicMetadata', () => {
  it('caso observado: título con «432 hertz» y canal como artista', () => {
    const meta = normalizeMusicMetadata({ title: 'Callaíta - 432 hertz', artist: 'Guad4W' });
    expect(meta.title).toBe('Callaíta');
    expect(meta.artist).toBe('');
    expect(meta.artistConfidence).toBe('low');
    expect(meta.cacheKey).toBe('::callaita'); // la clave ignora acentos y mayúsculas
  });

  it('caso observado: uploader distinto del artista ⇒ no se usa como artista', () => {
    const meta = normalizeMusicMetadata({ title: 'Callaíta', artist: 'YouTube Stream', uploader: 'LatinHype' });
    expect(meta.artist).toBe('');
    expect(meta.artistSource).toBe('unknown');
    expect(meta.uploader).toBe('LatinHype');
  });

  it('deduce el artista del título cuando el canal no lo es', () => {
    const meta = normalizeMusicMetadata({ title: 'Bad Bunny - Callaíta (Official Video)', artist: 'LatinHype' });
    expect(meta.title).toBe('Callaíta');
    expect(meta.artist).toBe('Bad Bunny');
    expect(meta.artistConfidence).toBe('medium');
  });

  it('un canal «- Topic» sí es el artista', () => {
    const meta = normalizeMusicMetadata({ title: 'Callaíta', artist: 'Bad Bunny - Topic' });
    expect(meta.artist).toBe('Bad Bunny');
    expect(meta.artistConfidence).toBe('high');
  });

  it('respeta el artista real de la pista y no lo pisa con el uploader', () => {
    const meta = normalizeMusicMetadata({
      title: 'Callaíta (Official Video)',
      artist: 'Bad Bunny',
      uploader: 'LatinHype',
    });
    expect(meta.artist).toBe('Bad Bunny');
    expect(meta.artistSource).toBe('track');
    expect(meta.title).toBe('Callaíta');
  });

  it('marca las duraciones marcador como no fiables', () => {
    expect(isTrustedDuration(210)).toBe(false);
    expect(isTrustedDuration(180)).toBe(false);
    expect(isTrustedDuration(0)).toBe(false);
    expect(isTrustedDuration(197)).toBe(true);
    expect(normalizeMusicMetadata({ title: 'T', duration: 210 }).durationTrusted).toBe(false);
    expect(normalizeMusicMetadata({ title: 'T', duration: 197 }).durationTrusted).toBe(true);
  });
});

describe('buildLyricsQueries · pipeline acotado', () => {
  it('genera como máximo 4 pasos, en orden exacta → simplificada → search → secundario', () => {
    const meta = normalizeMusicMetadata({
      title: 'Callaíta',
      artist: 'Bad Bunny',
      album: 'Un Verano Sin Ti',
      duration: 197,
    });
    const steps = buildLyricsQueries(meta);
    expect(steps.map((step) => step.id)).toEqual([
      'lrclib-exact',
      'lrclib-simple',
      'lrclib-search',
      'lyrics-ovh',
    ]);
    expect(steps[0].url).toContain('album_name=Un+Verano+Sin+Ti');
    expect(steps[0].url).toContain('duration=197');
  });

  it('sin datos extra no repite la consulta exacta', () => {
    const meta = normalizeMusicMetadata({ title: 'Callaíta', artist: 'Bad Bunny' });
    expect(buildLyricsQueries(meta).map((step) => step.id)).toEqual([
      'lrclib-simple',
      'lrclib-search',
      'lyrics-ovh',
    ]);
  });

  it('con artista poco fiable busca por título, sin mencionar el canal', () => {
    const meta = normalizeMusicMetadata({ title: 'Callaíta', artist: 'LatinHype' });
    const steps = buildLyricsQueries(meta);
    expect(steps).toHaveLength(2);
    expect(steps.every((step) => !step.url.toLowerCase().includes('latinhype'))).toBe(true);
    expect(steps[0].url).toContain('q=Calla%C3%ADta');
  });

  it('nunca genera decenas de variantes', () => {
    const meta = normalizeMusicMetadata({
      title: 'Callaíta - 432 hertz (Official Video) [HD]',
      artist: 'Guad4W',
      album: 'X',
      duration: 197,
    });
    expect(buildLyricsQueries(meta).length).toBeLessThanOrEqual(4);
  });
});

describe('shouldSkipLyricsLookup', () => {
  it('descarta mezclas, sesiones y versiones no originales', () => {
    expect(shouldSkipLyricsLookup('DJ Set 1 hora', 3600)).toBe(true);
    expect(shouldSkipLyricsLookup('MOJABI GHOST (Slowed + Reverb)', 200)).toBe(true);
    expect(shouldSkipLyricsLookup('Tema (Instrumental)', 200)).toBe(true);
    expect(shouldSkipLyricsLookup('Tema', 3600)).toBe(true);
  });

  it('no descarta canciones normales', () => {
    expect(shouldSkipLyricsLookup('Callaíta', 197)).toBe(false);
    expect(shouldSkipLyricsLookup('MOJABI GHOST', 200)).toBe(false);
  });
});
