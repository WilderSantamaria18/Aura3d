import { describe, it, expect } from 'vitest';
import { MIN_TRIM_SECONDS, isTrimActive, pickRecorderMime, planTrim } from '../services/videoTrim';
import { isUsableDuration, resolveVideoDuration } from '../utils/videoDuration';
import { cardFileName } from '../services/storyCard/assets';
import { DEFAULT_CARD_CONFIG, sanitizeCardConfig } from '../services/storyCard/config';

describe('planTrim', () => {
  it('ajusta el tramo al vídeo y devuelve su longitud', () => {
    expect(planTrim(1, 3.5, 10)).toEqual({ start: 1, end: 3.5, length: 2.5 });
    expect(planTrim(-5, 99, 10)).toEqual({ start: 0, end: 10, length: 10 });
  });

  it('rechaza tramos demasiado cortos o invertidos', () => {
    expect(() => planTrim(2, 2.1, 10)).toThrow(/demasiado corto/);
    expect(() => planTrim(5, 3, 10)).toThrow(/demasiado corto/);
    expect(planTrim(2, 2 + MIN_TRIM_SECONDS, 10).length).toBeCloseTo(MIN_TRIM_SECONDS);
  });

  it('rechaza valores que no son números o un vídeo sin duración', () => {
    expect(() => planTrim(NaN, 3, 10)).toThrow();
    expect(() => planTrim(0, Infinity, 10)).toThrow();
    expect(() => planTrim(0, 3, 0)).toThrow();
    expect(() => planTrim(0, 3, Infinity)).toThrow();
  });
});

describe('isTrimActive', () => {
  it('un tramo que abarca casi todo el vídeo no cuenta como recorte (no se recodifica sin motivo)', () => {
    expect(isTrimActive(0, 10, 10)).toBe(false);
    expect(isTrimActive(0.05, 9.95, 10)).toBe(false);
  });

  it('detecta un recorte por el inicio, por el final o por ambos', () => {
    expect(isTrimActive(2, 10, 10)).toBe(true);
    expect(isTrimActive(0, 7, 10)).toBe(true);
    expect(isTrimActive(1, 4, 10)).toBe(true);
  });

  it('sin duración conocida o sin marca de fin no hay recorte', () => {
    expect(isTrimActive(1, 0, 10)).toBe(false);
    expect(isTrimActive(1, 5, 0)).toBe(false);
  });
});

describe('pickRecorderMime', () => {
  const supports = (...types: string[]) => (t: string) => types.includes(t);

  it('prefiere el códec del original si el navegador lo admite', () => {
    expect(pickRecorderMime('video/webm;codecs=vp8,opus', supports('video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus'))).toBe(
      'video/webm;codecs=vp8,opus'
    );
  });

  it('si no, usa el mejor disponible por orden', () => {
    expect(pickRecorderMime('video/x-raro', supports('video/webm', 'video/mp4'))).toBe('video/webm');
    expect(pickRecorderMime('', supports('video/webm;codecs=vp9,opus', 'video/webm'))).toBe('video/webm;codecs=vp9,opus');
  });

  it('devuelve null si el navegador no admite ninguno', () => {
    expect(pickRecorderMime('video/webm', supports())).toBeNull();
  });
});

describe('resolveVideoDuration', () => {
  /** Vídeo simulado que, como Chrome con un webm de MediaRecorder, declara duración infinita */
  class FakeVideo extends EventTarget {
    duration = Infinity;
    private time = 0;
    constructor(
      private readonly real: number | null,
      private readonly throwOnSeek = false
    ) {
      super();
    }
    get currentTime() {
      return this.time;
    }
    set currentTime(v: number) {
      if (this.throwOnSeek) throw new Error('no se puede mover');
      this.time = v;
      if (v > 1e50 && this.real !== null) {
        setTimeout(() => {
          this.duration = this.real!;
          this.time = this.real!;
          this.dispatchEvent(new Event('durationchange'));
          this.dispatchEvent(new Event('timeupdate'));
        }, 0);
      }
    }
  }
  const asVideo = (v: FakeVideo) => v as unknown as HTMLVideoElement;

  it('si la duración ya es válida no toca el vídeo', async () => {
    const v = new FakeVideo(null);
    v.duration = 12.5;
    expect(await resolveVideoDuration(asVideo(v))).toBe(12.5);
    expect(v.currentTime).toBe(0);
  });

  it('calcula la duración real de un vídeo que declara Infinity y deja la posición como estaba', async () => {
    const v = new FakeVideo(4.2);
    v.currentTime = 1.5;
    expect(await resolveVideoDuration(asVideo(v), 0)).toBe(4.2);
    expect(v.currentTime).toBe(1.5);
  });

  it('usa el valor de respaldo si el navegador nunca la publica', async () => {
    const v = new FakeVideo(null);
    expect(await resolveVideoDuration(asVideo(v), 7, 30)).toBe(7);
  });

  it('usa el respaldo si el navegador no deja mover el vídeo', async () => {
    const v = new FakeVideo(4, true);
    expect(await resolveVideoDuration(asVideo(v), 9)).toBe(9);
  });

  it('isUsableDuration', () => {
    expect(isUsableDuration(3)).toBe(true);
    for (const bad of [0, -1, Infinity, NaN]) expect(isUsableDuration(bad)).toBe(false);
  });
});

describe('formato de archivo de la tarjeta', () => {
  it('por defecto es PNG y se valida lo guardado', () => {
    expect(DEFAULT_CARD_CONFIG.fileFormat).toBe('png');
    expect(sanitizeCardConfig({ fileFormat: 'jpeg' }).fileFormat).toBe('jpeg');
    expect(sanitizeCardConfig({ fileFormat: 'gif' }).fileFormat).toBe('png');
    expect(sanitizeCardConfig({}).fileFormat).toBe('png'); // preferencias antiguas sin el campo
  });

  it('el nombre del archivo lleva la extensión que toca', () => {
    expect(cardFileName({ ...DEFAULT_CARD_CONFIG, fileFormat: 'png' }, 'Canción Ñandú!')).toBe('Aura3D_story_Cancion_Nandu.png');
    expect(cardFileName({ ...DEFAULT_CARD_CONFIG, fileFormat: 'jpeg', format: 'post' }, 'Hola')).toBe('Aura3D_post_Hola.jpg');
    expect(cardFileName(DEFAULT_CARD_CONFIG, '???')).toBe('Aura3D_story_tarjeta.png');
  });
});
