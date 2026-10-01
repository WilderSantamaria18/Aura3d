import { describe, it, expect } from 'vitest';
import {
  CARD_PALETTES,
  DEFAULT_CARD_CONFIG,
  readableTextColor,
  resolveCardContent,
  sanitizeCardConfig,
  sanitizeHandle,
  suggestHandle,
  type CardConfig,
} from '../services/storyCard/config';

const cfg = (patch: Partial<CardConfig> = {}): CardConfig => ({ ...DEFAULT_CARD_CONFIG, ...patch });

describe('sanitizeHandle', () => {
  it('quita la arroba, los espacios y los caracteres no válidos en Instagram', () => {
    expect(sanitizeHandle('@dhonkio.music')).toBe('dhonkio.music');
    expect(sanitizeHandle('@@usuario')).toBe('usuario');
    expect(sanitizeHandle('  mi usuario!  ')).toBe('miusuario');
    expect(sanitizeHandle('a_b.c-d')).toBe('a_b.cd');
  });

  it('limita la longitud a 30 caracteres y tolera valores que no son texto', () => {
    expect(sanitizeHandle('x'.repeat(50))).toHaveLength(30);
    expect(sanitizeHandle(undefined)).toBe('');
    expect(sanitizeHandle(42)).toBe('');
    expect(sanitizeHandle('@')).toBe('');
  });
});

describe('suggestHandle', () => {
  it('propone el usuario de Aura en minúsculas y con guion bajo', () => {
    expect(suggestHandle('Wilder Santa', false)).toBe('wilder_santa');
  });

  it('no inventa un usuario para invitados ni cuando falta', () => {
    expect(suggestHandle('Invitado', true)).toBe('');
    expect(suggestHandle(undefined, false)).toBe('');
    expect(suggestHandle('', false)).toBe('');
  });
});

describe('sanitizeCardConfig', () => {
  it('devuelve los valores por defecto ante datos vacíos, corruptos o de otro tipo', () => {
    expect(sanitizeCardConfig(null)).toEqual(DEFAULT_CARD_CONFIG);
    expect(sanitizeCardConfig('texto')).toEqual(DEFAULT_CARD_CONFIG);
    expect(sanitizeCardConfig(undefined)).toEqual(DEFAULT_CARD_CONFIG);
    expect(sanitizeCardConfig([1, 2, 3])).toEqual(DEFAULT_CARD_CONFIG);
  });

  it('acepta el alias antiguo "pure-void" y rechaza plantillas desconocidas', () => {
    expect(sanitizeCardConfig({ template: 'pure-void' }).template).toBe('pure_void');
    expect(sanitizeCardConfig({ template: 'studio' }).template).toBe('studio');
    expect(sanitizeCardConfig({ template: 'no-existe' }).template).toBe(DEFAULT_CARD_CONFIG.template);
  });

  it('valida colores, enumerados y números', () => {
    const out = sanitizeCardConfig({
      primaryColor: 'rojo',
      secondaryColor: '#abc',
      format: 'panorama',
      font: 'serif',
      bloom: 9,
      grain: -3,
      vignette: 'mucho',
    });
    expect(out.primaryColor).toBe(DEFAULT_CARD_CONFIG.primaryColor); // inválido: se descarta
    expect(out.secondaryColor).toBe('#abc'); // hex corto válido
    expect(out.format).toBe('story');
    expect(out.font).toBe('serif');
    expect(out.bloom).toBe(1); // se limita al rango
    expect(out.grain).toBe(0);
    expect(out.vignette).toBe(DEFAULT_CARD_CONFIG.vignette);
  });

  it('sanea el perfil: usuario limpio y foto solo si es una imagen razonable', () => {
    const ok = sanitizeCardConfig({ profile: { show: true, handle: '@Mi Usuario', avatar: 'data:image/jpeg;base64,AAAA', style: 'signature' } });
    expect(ok.profile).toEqual({ show: true, handle: 'MiUsuario', avatar: 'data:image/jpeg;base64,AAAA', style: 'signature' });

    expect(sanitizeCardConfig({ profile: { avatar: 'https://evil.example/x.png' } }).profile.avatar).toBeNull();
    expect(sanitizeCardConfig({ profile: { avatar: 'data:image/png;base64,' + 'A'.repeat(500_000) } }).profile.avatar).toBeNull();
    expect(sanitizeCardConfig({ profile: { style: 'raro' } }).profile.style).toBe('badge');
  });

  it('recorta y limpia los textos', () => {
    const out = sanitizeCardConfig({ title: '  Una   canción \n larga  ', artist: 'x'.repeat(200), caption: 'y'.repeat(99) });
    expect(out.title).toBe('Una canción larga');
    expect(out.artist).toHaveLength(60);
    expect(out.caption).toHaveLength(32);
  });

  it('una configuración válida sobrevive a ir y volver por JSON', () => {
    const custom = cfg({ template: 'vinyl', format: 'post', autoText: false, title: 'Hola', bloom: 0.25 });
    expect(sanitizeCardConfig(JSON.parse(JSON.stringify(custom)))).toEqual(custom);
  });
});

describe('resolveCardContent', () => {
  const track = { title: 'Midnight Drive', artist: 'Dhonkio', coverUrl: 'https://x/c.jpg', bpm: 124.4, camelotKey: '8A' };
  const fixed = new Date('2026-10-01T12:00:00');

  it('con "seguir la canción" manda la que suena', () => {
    const c = resolveCardContent(cfg({ autoText: true, title: 'Manual', artist: 'Otro' }), track, 0, fixed);
    expect(c.title).toBe('Midnight Drive');
    expect(c.artist).toBe('Dhonkio');
    expect(c.coverUrl).toBe('https://x/c.jpg');
  });

  it('con el texto a mano manda lo escrito', () => {
    const c = resolveCardContent(cfg({ autoText: false, title: 'Manual', artist: 'Otro' }), track, 0, fixed);
    expect(c.title).toBe('Manual');
    expect(c.artist).toBe('Otro');
  });

  it('sin canción ni texto usa un título de reserva, nunca queda vacío', () => {
    const c = resolveCardContent(cfg({ autoText: true, title: '', artist: '' }), null, 0, fixed);
    expect(c.title.length).toBeGreaterThan(0);
    expect(c.artist.length).toBeGreaterThan(0);
  });

  it('no inventa BPM ni tono: solo aparecen si se conocen', () => {
    const unknown = resolveCardContent(cfg(), { title: 'A', artist: 'B' }, 0, fixed);
    expect(unknown.bpm).toBeNull();
    expect(unknown.key).toBeNull();

    const known = resolveCardContent(cfg(), track, 0, fixed);
    expect(known.bpm).toBe(124);
    expect(known.key).toBe('8A');
  });

  it('usa el BPM detectado en vivo cuando la canción no lo trae', () => {
    const c = resolveCardContent(cfg(), { title: 'A', artist: 'B' }, 128, fixed);
    expect(c.bpm).toBe(128);
  });

  it('el usuario solo aparece si el perfil está activado', () => {
    const profile = { show: false, handle: 'dhonkio', avatar: null, style: 'badge' as const };
    expect(resolveCardContent(cfg({ profile }), track, 0, fixed).handle).toBe('');
    expect(resolveCardContent(cfg({ profile: { ...profile, show: true } }), track, 0, fixed).handle).toBe('dhonkio');
  });

  it('formatea la fecha en español y en mayúsculas', () => {
    expect(resolveCardContent(cfg(), track, 0, fixed).dateLabel).toMatch(/^01 OCT\.? 2026$|^01 OCT 2026$/);
  });
});

describe('paletas y color', () => {
  it('todas las paletas tienen colores hexadecimales válidos', () => {
    for (const p of CARD_PALETTES) {
      for (const c of [p.background, p.primary, p.secondary, p.text]) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('el texto sobre un fondo personalizado siempre es legible', () => {
    expect(readableTextColor('#000000')).toBe('#ffffff');
    expect(readableTextColor('#07070d')).toBe('#ffffff');
    expect(readableTextColor('#ffffff')).toBe('#0b0b10');
    expect(readableTextColor('#fde68a')).toBe('#0b0b10'); // amarillo claro
    expect(readableTextColor('no-es-un-color')).toBe('#ffffff'); // inválido: se trata como oscuro
  });
});
