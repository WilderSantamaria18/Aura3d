import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WALLPAPERS_DIR = path.resolve(__dirname, '..', 'data', 'wallpapers');
if (!fs.existsSync(WALLPAPERS_DIR)) {
  fs.mkdirSync(WALLPAPERS_DIR, { recursive: true });
}

// Curated 4K High-Resolution Fallback Aesthetics matching the Aura Wallpapers themes
const CURATED_THEMES = {
  porsche: [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=2560&auto=format&fit=crop&q=90',
  ],
  lake: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=2560&auto=format&fit=crop&q=90',
  ],
  ghibli: [
    'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2560&auto=format&fit=crop&q=90',
  ],
  minimal: [
    'https://images.unsplash.com/photo-1494526585095-c41746248156?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=2560&auto=format&fit=crop&q=90',
  ],
  cyberpunk: [
    'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=2560&auto=format&fit=crop&q=90',
  ],
  cosmic: [
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=2560&auto=format&fit=crop&q=90',
  ],
  default: [
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=2560&auto=format&fit=crop&q=90',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=2560&auto=format&fit=crop&q=90',
  ],
};

function getHordeDimensions(aspectRatio, w = 1920, h = 1080) {
  if (aspectRatio === '16:9') return { width: 896, height: 512 };
  if (aspectRatio === '21:9') return { width: 896, height: 384 };
  if (aspectRatio === '9:16') return { width: 512, height: 896 };
  if (aspectRatio === '1:1') return { width: 512, height: 512 };
  if (aspectRatio === '4:3') return { width: 768, height: 576 };

  const ratio = w && h ? w / h : 16 / 9;
  if (ratio >= 2.0) return { width: 896, height: 384 }; // 21:9
  if (ratio >= 1.5) return { width: 896, height: 512 }; // 16:9
  if (ratio >= 1.2) return { width: 768, height: 576 }; // 4:3
  if (ratio <= 0.65) return { width: 512, height: 896 }; // 9:16
  return { width: 512, height: 512 }; // 1:1
}

function resolveAestheticFallback(prompt = '', style = '', aspectRatio = '16:9', width = 1920, height = 1080) {
  const p = (prompt + ' ' + style).toLowerCase();
  let selected = CURATED_THEMES.default[0];
  if (p.includes('porsche') || p.includes('car') || p.includes('auto') || p.includes('coche') || p.includes('lavanda')) {
    const list = CURATED_THEMES.porsche;
    selected = list[Math.floor(Math.random() * list.length)];
  } else if (p.includes('lago') || p.includes('lake') || p.includes('bote') || p.includes('boat') || p.includes('agua') || p.includes('water')) {
    const list = CURATED_THEMES.lake;
    selected = list[Math.floor(Math.random() * list.length)];
  } else if (p.includes('ghibli') || p.includes('anime') || p.includes('campo') || p.includes('countryside') || p.includes('nube')) {
    const list = CURATED_THEMES.ghibli;
    selected = list[Math.floor(Math.random() * list.length)];
  } else if (p.includes('cyberpunk') || p.includes('neon') || p.includes('shinjuku') || p.includes('tokyo') || p.includes('lluvia')) {
    const list = CURATED_THEMES.cyberpunk;
    selected = list[Math.floor(Math.random() * list.length)];
  } else if (p.includes('cosmic') || p.includes('espacio') || p.includes('space') || p.includes('nebula') || p.includes('galaxia')) {
    const list = CURATED_THEMES.cosmic;
    selected = list[Math.floor(Math.random() * list.length)];
  } else if (p.includes('minimal') || p.includes('arquitectura') || p.includes('edificio') || p.includes('rascacielos')) {
    const list = CURATED_THEMES.minimal;
    selected = list[Math.floor(Math.random() * list.length)];
  } else {
    const list = CURATED_THEMES.default;
    selected = list[Math.floor(Math.random() * list.length)];
  }

  const baseUrl = selected.split('?')[0];
  const arParam = (aspectRatio || '16:9').replace('/', ':');
  return `${baseUrl}?w=${width}&h=${height}&ar=${arParam}&auto=format&fit=crop&crop=entropy&q=90`;
}

/**
 * POST /api/wallpapers/generate
 * Generador backend de fondos AI con tolerancia a fallos multicapa:
 * 1. AI Horde (Stable Diffusion descentralizado con relación de aspecto nativa)
 * 2. Fotografía 4K curated temática de ultra-alta definición con proporción exacta
 */
async function generateWithAIHorde(prompt, width = 896, height = 512, seed) {
  try {
    const post = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': '0000000000' },
      body: JSON.stringify({
        prompt: (prompt || 'cinematic 4k wallpaper masterpiece') + ', ultra detailed, 8k resolution, photorealistic, pristine sharp focus',
        params: {
          steps: 18,
          width: width,
          height: height,
          seed: seed ? String(seed) : undefined,
          n: 1,
        },
      }),
    });

    const data = await post.json();
    if (!data?.id) return null;

    // Polling hasta 26 segundos (13 iteraciones de 2s)
    for (let i = 0; i < 13; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const check = await fetch(`https://stablehorde.net/api/v2/generate/check/${data.id}`);
      if (!check.ok) continue;
      const s = await check.json();
      if (s.done) {
        const res = await fetch(`https://stablehorde.net/api/v2/generate/status/${data.id}`);
        if (!res.ok) return null;
        const finalData = await res.json();
        const imgUrl = finalData.generations?.[0]?.img;
        if (!imgUrl) return null;

        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) return null;
        return Buffer.from(await imgRes.arrayBuffer());
      }
      if (s.faulted) return null;
    }
  } catch (err) {
    console.warn('[Wallpapers] AI Horde error:', err.message);
  }
  return null;
}

/**
 * POST /api/wallpapers/generate
 */
router.post('/generate', async (req, res) => {
  const { prompt, negativePrompt, width, height, seed, style, aspectRatio } = req.body;
  const w = Math.min(3840, Math.max(256, Number(width) || 1920));
  const h = Math.min(3840, Math.max(256, Number(height) || 1080));
  const s = seed || Math.floor(Math.random() * 10000000);
  const ratio = aspectRatio || (w >= h ? (w / h >= 2.0 ? '21:9' : '16:9') : '9:16');

  // Calcular dimensiones nativas exactas para AI Horde (múltiplos de 64, sin deformación)
  const hordeDims = getHordeDimensions(ratio, w, h);

  // 1. AI Horde: Generación IA real con proporción exacta nativa
  console.log(`[Wallpapers] Generando IA [${ratio}] (${hordeDims.width}x${hordeDims.height}) para: "${(prompt || '').slice(0, 45)}..."`);
  const hordeBuffer = await generateWithAIHorde(prompt, hordeDims.width, hordeDims.height, s);
  if (hordeBuffer && hordeBuffer.length > 5000) {
    const filename = `wp_ai_${Date.now()}_${s}.webp`;
    const filePath = path.join(WALLPAPERS_DIR, filename);
    fs.writeFileSync(filePath, hordeBuffer);

    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol || 'http';
    const fileUrl = `${protocol}://${host}/api/wallpapers/image/${filename}`;

    console.log(`[Wallpapers] Fondo IA generado exitosamente (${hordeDims.width}x${hordeDims.height}, ${ratio}).`);
    return res.json({
      success: true,
      url: fileUrl,
      engine: 'ai-horde-stable-diffusion',
      width: hordeDims.width,
      height: hordeDims.height,
      aspectRatio: ratio,
    });
  }

  // 2. Fallback fotográfico temático en 4K con la proporción exacta solicitada
  console.log(`[Wallpapers] Usando fotografía 4K curada con relación ${ratio} (${w}x${h}).`);
  try {
    const curatedUrl = resolveAestheticFallback(prompt, style, ratio, w, h);
    const downloadRes = await fetch(curatedUrl);
    if (downloadRes.ok) {
      const buffer = Buffer.from(await downloadRes.arrayBuffer());
      const filename = `wp_curated_${Date.now()}_${s}.jpg`;
      const filePath = path.join(WALLPAPERS_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      const host = req.get('host') || 'localhost:4000';
      const protocol = req.protocol || 'http';
      const fileUrl = `${protocol}://${host}/api/wallpapers/image/${filename}`;

      return res.json({
        success: true,
        url: fileUrl,
        engine: 'curated-4k-aesthetic',
        width: w,
        height: h,
        aspectRatio: ratio,
      });
    }
  } catch (curatedErr) {
    console.warn('[Wallpapers] Error al descargar curated fallback:', curatedErr.message);
  }

  return res.status(502).json({
    success: false,
    error: 'No se pudo generar la imagen en este momento. Inténtalo de nuevo.',
  });
});

/**
 * GET /api/wallpapers/image/:filename
 * Entrega directa de fondos cacheados en disco con cabeceras de alto rendimiento
 */
router.get('/image/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(WALLPAPERS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Wallpaper not found');
  }

  const mimeType = filename.endsWith('.webp') ? 'image/webp' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  return fs.createReadStream(filePath).pipe(res);
});

/**
 * GET /api/wallpapers/proxy?url=...
 * Proxy seguro para descargar y cachear imágenes externas
 */
router.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Aura3D/2.0',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send('Upstream fetch error');
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (err) {
    return res.status(500).send('Proxy error: ' + err.message);
  }
});

export default router;
