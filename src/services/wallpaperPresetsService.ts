import type { WallpaperPreset, WallpaperStyle, WallpaperPalette } from '../types/wallpaper';

interface StyleConfig {
  label: string;
  suffix: string;
  negativePrefix: string;
  paletteHints: Record<WallpaperPalette, string>;
}

export const STYLE_CONFIGS: Record<WallpaperStyle, StyleConfig> = {
  cinematic: {
    label: 'Cinemático',
    suffix:
      'cinematic 35mm photography, anamorphic lens, golden hour warm sunlight, shallow depth of field, atmospheric haze, 8K ultra-detailed, minimalist composition, highly aesthetic',
    negativePrefix: 'cartoon, 3d render, anime, text, watermark, low resolution, blurry, oversaturated, messy, cluttered',
    paletteHints: {
      'warm-sunset': 'warm orange, amber, dusky pink and lavender tones',
      'cool-night': 'cool midnight blue, cyan and deep navy tones',
      'pastel-dream': 'soft pastel blush, apricot and lavender tones',
      'monochrome': 'black and white high contrast, deep blacks',
      'vibrant': 'rich vibrant cinematic colors, golden highlights',
      'muted': 'muted cinematic tones, soft faded highlights',
      'custom': '',
    },
  },
  ethereal: {
    label: 'Etéreo',
    suffix:
      'ethereal dreamscape, minimalist zen composition, calm water mirror reflection, pastel puffy clouds, twilight serenity, atmospheric soft glow, 8K wallpaper',
    negativePrefix: 'harsh lighting, dark, chaotic, cluttered, ugly, noisy, high contrast',
    paletteHints: {
      'warm-sunset': 'peach, soft rose gold and warm lavender reflections',
      'cool-night': 'ethereal turquoise, ice blue and periwinkle night',
      'pastel-dream': 'dreamy baby blue, cotton candy pink and violet',
      'monochrome': 'soft misty monochrome, gentle fog',
      'vibrant': 'luminous iridescent colors',
      'muted': 'desaturated calm pastel mist',
      'custom': '',
    },
  },
  ghibli: {
    label: 'Studio Ghibli',
    suffix:
      'Studio Ghibli aesthetic, hand-painted anime background, nostalgic pastoral countryside, giant fluffy cumulus clouds, gentle summer breeze, vibrant verdant hills, Makoto Shinkai lighting, 8K wallpaper',
    negativePrefix: 'photorealistic, dark, cyberpunk, gritty, 3D CGI, low quality, deformed',
    paletteHints: {
      'warm-sunset': 'warm golden hour anime sky, orange clouds',
      'cool-night': 'starry twilight blue anime sky',
      'pastel-dream': 'soft pastel anime color grading',
      'monochrome': 'monochrome manga ink illustration',
      'vibrant': 'vibrant anime greens, cerulean blue sky',
      'muted': 'nostalgic muted watercolor palette',
      'custom': '',
    },
  },
  minimal: {
    label: 'Minimalista',
    suffix:
      'minimalist architectural composition, clean negative space, smooth gradient sky, solitary subject, brutalist elegant lines, pristine quality, 8K wallpaper',
    negativePrefix: 'busy, noisy, cluttered, complex, distracting, ornate',
    paletteHints: {
      'warm-sunset': 'warm minimalist sunset gradient',
      'cool-night': 'deep blue minimalist dusk gradient',
      'pastel-dream': 'soft pastel dual-tone gradient',
      'monochrome': 'pure architectural monochrome and shadows',
      'vibrant': 'high contrast bold color accents',
      'muted': 'soft neutral beige and slate tones',
      'custom': '',
    },
  },
  cyberpunk: {
    label: 'Cyberpunk',
    suffix:
      'cyberpunk neon noir aesthetic, rain-slicked reflective asphalt, glowing holographic teal and magenta lights, misty futuristic skyscraper silhouette, Blade Runner 2049 mood, 8K',
    negativePrefix: 'daylight, pastoral, sunny, bright, low quality, muddy',
    paletteHints: {
      'warm-sunset': 'neon amber and fiery neon orange haze',
      'cool-night': 'deep cyan, cobalt blue and ultraviolet neon',
      'pastel-dream': 'soft vaporwave neon pastels',
      'monochrome': 'stark black and white with subtle neon accents',
      'vibrant': 'high voltage hyper-saturated neon lights',
      'muted': 'smoky muted dystopian neon',
      'custom': '',
    },
  },
  synthwave: {
    label: 'Synthwave',
    suffix:
      'synthwave retro 80s aesthetic, neon wireframe grid horizon, giant glowing low-poly sun, palm tree silhouettes, chrome reflections, vintage CRT glow, 8K',
    negativePrefix: 'modern photo, realistic, dull, desaturated, messy',
    paletteHints: {
      'warm-sunset': 'radiant magenta, electric purple and neon yellow sun',
      'cool-night': 'deep purple and electric cyan night grid',
      'pastel-dream': 'outrun pastel sunrise colors',
      'monochrome': 'monochrome wireframe grid',
      'vibrant': 'hyper-vibrant 1980s neon synthwave palette',
      'muted': 'faded VHS tape retro tones',
      'custom': '',
    },
  },
  nature: {
    label: 'Naturaleza',
    suffix:
      'breathtaking pristine landscape, misty mountain peaks, alpine lake mirror surface, morning golden hour light, tranquil forest, National Geographic award-winning photography, 8K',
    negativePrefix: 'buildings, roads, modern artifacts, people, oversaturated, blurry',
    paletteHints: {
      'warm-sunset': 'alpine glow sunset across mountain peaks',
      'cool-night': 'crisp cool twilight blue and starlight',
      'pastel-dream': 'soft morning mist with pastel sunbeams',
      'monochrome': 'fine-art black and white nature landscape',
      'vibrant': 'lush emerald forest and sapphire water',
      'muted': 'moody Nordic desaturated tones',
      'custom': '',
    },
  },
  abstract: {
    label: 'Abstracto',
    suffix:
      'luxurious abstract fluid art, silky liquid waves, holographic pearlescent pigments, marble swirls, Apple wallpaper style, smooth organic curves, 8K wallpaper',
    negativePrefix: 'figurative elements, text, artifacts, jagged edges, low resolution',
    paletteHints: {
      'warm-sunset': 'warm liquid bronze, rose gold and amber ripples',
      'cool-night': 'cool liquid cobalt, teal and deep oceanic blues',
      'pastel-dream': 'opalescent pastel fluid swirls',
      'monochrome': 'liquid mercury and obsidian black swirls',
      'vibrant': 'dynamic vivid rainbow chromatic ribbons',
      'muted': 'minimal satin silk folds and gentle gradients',
      'custom': '',
    },
  },
  cosmic: {
    label: 'Cósmico',
    suffix:
      'deep cosmic nebula, James Webb Space Telescope photography, swirling star clusters, ethereal stellar dust, deep abyssal space void, vibrant celestial light, 8K wallpaper',
    negativePrefix: 'earth, planets with faces, cartoon stars, blurry, artifact',
    paletteHints: {
      'warm-sunset': 'fiery solar nebula with orange and gold starfield',
      'cool-night': 'deep indigo and sapphire stellar dust',
      'pastel-dream': 'cotton candy stellar nursery with pink and cyan clouds',
      'monochrome': 'deep field monochrome starlight',
      'vibrant': 'hyper-luminous stellar ionization colors',
      'muted': 'deep dark interstellar dust clouds',
      'custom': '',
    },
  },
  custom: {
    label: 'Personalizado',
    suffix: '8K ultra-detailed wallpaper, high-end production, masterpiece',
    negativePrefix: 'low quality, blurry, artifact',
    paletteHints: {
      'warm-sunset': '',
      'cool-night': '',
      'pastel-dream': '',
      'monochrome': '',
      'vibrant': '',
      'muted': '',
      'custom': '',
    },
  },
};

export const enhancePrompt = (
  userPrompt: string,
  style: WallpaperStyle,
  palette?: WallpaperPalette
): string => {
  const config = STYLE_CONFIGS[style] || STYLE_CONFIGS.cinematic;
  const paletteHint =
    palette && palette !== 'custom' ? config.paletteHints[palette] || '' : '';
  return [userPrompt.trim(), paletteHint, config.suffix].filter(Boolean).join(', ');
};

export const buildNegativePrompt = (style: WallpaperStyle): string => {
  return (
    STYLE_CONFIGS[style]?.negativePrefix ||
    'low quality, blurry, distorted, watermark, text, artifacts'
  );
};

export const CURATED_PRESETS: WallpaperPreset[] = [
  {
    id: 'preset-cinematic-porsche',
    name: 'Sunset Drive',
    description: 'Porsche clásico en un campo de lavanda al atardecer',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2560&auto=format&fit=crop&q=90',
    style: 'cinematic',
    palette: 'warm-sunset',
    tags: ['Porsche', 'Lavanda', 'Atardecer', 'Cinemático'],
    aspectRatio: '21:9',
  },
  {
    id: 'preset-ethereal-lake',
    name: 'Silent Lake',
    description: 'Bote solitario en lago espejo con nubes rosas al amanecer',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2560&auto=format&fit=crop&q=90',
    style: 'ethereal',
    palette: 'pastel-dream',
    tags: ['Lago', 'Bote', 'Reflejo', 'Etéreo'],
    aspectRatio: '21:9',
  },
  {
    id: 'preset-ghibli-countryside',
    name: 'Countryside Dreams',
    description: 'Casa rural nostálgica con nubes monumentales Studio Ghibli',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=2560&auto=format&fit=crop&q=90',
    style: 'ghibli',
    palette: 'vibrant',
    tags: ['Ghibli', 'Campo', 'Casa', 'Nubes'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-cyberpunk-tokyo',
    name: 'Neo Shinjuku',
    description: 'Avenida cyberpunk lluviosa con reflejos de neón magenta y cian',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=2560&auto=format&fit=crop&q=90',
    style: 'cyberpunk',
    palette: 'cool-night',
    tags: ['Cyberpunk', 'Neón', 'Lluvia', 'Tokyo'],
    aspectRatio: '21:9',
  },
  {
    id: 'preset-minimal-solitude',
    name: 'Solitary Horizon',
    description: 'Composición arquitectónica minimalista con cielo degradado',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1494526585095-c41746248156?w=2560&auto=format&fit=crop&q=90',
    style: 'minimal',
    palette: 'muted',
    tags: ['Minimal', 'Arquitectura', 'Calma'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-synthwave-highway',
    name: 'Midnight Highway',
    description: 'Horizonte retro 80s con rejilla y atardecer de cromo violeta',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2560&auto=format&fit=crop&q=90',
    style: 'synthwave',
    palette: 'warm-sunset',
    tags: ['Synthwave', '80s', 'Retro', 'Grid'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-nature-misty-peaks',
    name: 'Misty Fjords',
    description: 'Picos alpinos esmeralda cubiertos de niebla y agua turquesa',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2560&auto=format&fit=crop&q=90',
    style: 'nature',
    palette: 'cool-night',
    tags: ['Montañas', 'Niebla', 'Naturaleza', 'Lago'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-abstract-liquid-glass',
    name: 'Liquid Chromatic Flow',
    description: 'Ondas de cristal líquido con refracciones holográficas',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=2560&auto=format&fit=crop&q=90',
    style: 'abstract',
    palette: 'vibrant',
    tags: ['Liquid Glass', 'Fluido', 'Abstracto'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-cosmic-carina',
    name: 'Carina Deep Nebula',
    description: 'Nebulosa estelar profunda capturada en alta resolución',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2560&auto=format&fit=crop&q=90',
    style: 'cosmic',
    palette: 'cool-night',
    tags: ['Espacio', 'Nebulosa', 'Galaxia', 'Estrellas'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-cinematic-desert-dune',
    name: 'Golden Sahara Dunes',
    description: 'Dunas infinitas de arena dorada esculpidas por el viento',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=2560&auto=format&fit=crop&q=90',
    style: 'cinematic',
    palette: 'warm-sunset',
    tags: ['Dunas', 'Desierto', 'Arena', 'Dorado'],
    aspectRatio: '21:9',
  },
  {
    id: 'preset-ethereal-cherry-blossom',
    name: 'Sakura Mist',
    description: 'Cerezos en flor bajo suave niebla matutina con pétalos flotando',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=2560&auto=format&fit=crop&q=90',
    style: 'ethereal',
    palette: 'pastel-dream',
    tags: ['Sakura', 'Cerezo', 'Japón', 'Niebla'],
    aspectRatio: '16:9',
  },
  {
    id: 'preset-minimal-monolith',
    name: 'Titan Monolith',
    description: 'Estructura geométrica solitaria bajo un cielo de acero puro',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    fullUrl:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=2560&auto=format&fit=crop&q=90',
    style: 'minimal',
    palette: 'monochrome',
    tags: ['Monocromo', 'Monolito', 'Sombra', 'Minimal'],
    aspectRatio: '16:9',
  },
];

export const PROMPT_SUGGESTIONS = [
  'Un Porsche 911 clásico en un campo de lavanda al atardecer, cinematográfico',
  'Un bote solitario de madera en un lago espejo con nubes rosas y doradas',
  'Casa rural nostálgica en las colinas verdes con nubes gigantes Studio Ghibli',
  'Rascacielos brutalista minimalista entre una densa niebla azulada',
  'Avenida cyberpunk nocturna con lluvia y reflejos de neón magenta',
  'Picos nevados iluminados por los primeros rayos del sol sobre un lago',
  'Ondas de cristal líquido fluido con refracciones de prisma Apple visionOS',
  'Nebulosa cósmica púrpura y dorada con cúmulos de estrellas James Webb',
];

/**
 * Mapea armoniosamente el fondo con el tema de Modo Lucid
 * para que todo el ecosistema (paneles, luces, partículas 3D) converja.
 */
export function getLucidThemeForWallpaper(palette?: WallpaperPalette, style?: WallpaperStyle): string {
  if (style === 'ghibli') return 'glacier-emerald';
  if (style === 'cyberpunk') return 'tokyo-twilight';
  if (style === 'cosmic') return 'cosmic-cyan-gold';
  switch (palette) {
    case 'warm-sunset':
      return 'electric-lavender';
    case 'cool-night':
      return 'glacier-emerald';
    case 'pastel-dream':
      return 'electric-lavender';
    case 'monochrome':
      return 'cosmic-cyan-gold';
    case 'vibrant':
      return 'tokyo-twilight';
    default:
      return 'cosmic-cyan-gold';
  }
}

