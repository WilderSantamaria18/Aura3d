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

function resolveAestheticFallback(prompt = '', style = '') {
  const p = (prompt + ' ' + style).toLowerCase();
  if (p.includes('porsche') || p.includes('car') || p.includes('auto') || p.includes('coche') || p.includes('lavanda')) {
    const list = CURATED_THEMES.porsche;
    return list[Math.floor(Math.random() * list.length)];
  }
  if (p.includes('lago') || p.includes('lake') || p.includes('bote') || p.includes('boat') || p.includes('agua') || p.includes('water')) {
    const list = CURATED_THEMES.lake;
    return list[Math.floor(Math.random() * list.length)];
  }
  if (p.includes('ghibli') || p.includes('anime') || p.includes('campo') || p.includes('countryside') || p.includes('nube')) {
    const list = CURATED_THEMES.ghibli;
    return list[Math.floor(Math.random() * list.length)];
  }
  if (p.includes('cyberpunk') || p.includes('neon') || p.includes('shinjuku') || p.includes('tokyo') || p.includes('lluvia')) {
    const list = CURATED_THEMES.cyberpunk;
    return list[Math.floor(Math.random() * list.length)];
  }
  if (p.includes('cosmic') || p.includes('espacio') || p.includes('space') || p.includes('nebula') || p.includes('galaxia')) {
    const list = CURATED_THEMES.cosmic;
    return list[Math.floor(Math.random() * list.length)];
  }
  if (p.includes('minimal') || p.includes('arquitectura') || p.includes('edificio') || p.includes('rascacielos')) {
    const list = CURATED_THEMES.minimal;
    return list[Math.floor(Math.random() * list.length)];
  }
  const list = CURATED_THEMES.default;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * POST /api/wallpapers/generate
 * Generador backend de fondos AI con tolerancia a fallos multicapa:
 * 1. Replicate (si está configurado)
 * 2. Pollinations AI guardado en disco y servido vía URL estática (cero lag de Base64)
 * 3. Fotografía 4K curated temática de ultra-alta definición
 */
router.post('/generate', async (req, res) => {
  const { prompt, negativePrompt, width, height, seed, style } = req.body;
  const w = width || 1920;
  const h = height || 1080;
  const s = seed || Math.floor(Math.random() * 10000000);

  // 1. Replicate API Token
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (replicateToken) {
    try {
      const Replicate = (await import('replicate')).default;
      const replicate = new Replicate({ auth: replicateToken });

      const output = await replicate.run(
        'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        {
          input: {
            prompt,
            negative_prompt: negativePrompt,
            width: w,
            height: h,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            seed: s,
          },
        }
      );

      const url = Array.isArray(output) ? output[0] : output;
      return res.json({ success: true, url, engine: 'replicate-sdxl' });
    } catch (err) {
      console.warn('[Wallpapers] Replicate failed, falling back to backend Pollinations:', err.message);
    }
  }

  // 2. Pollinations AI desde Node (sin headers restrictivos de navegador)
  try {
    const cleanPrompt = encodeURIComponent(prompt || 'cinematic wallpaper 4k');
    const pollUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${w}&height=${h}&seed=${s}&nologo=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    const pollRes = await fetch(pollUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Aura3D/2.0',
        'Accept': 'image/jpeg,image/webp,image/png,*/*',
      },
    });
    clearTimeout(timeout);

    if (pollRes.ok) {
      const buffer = Buffer.from(await pollRes.arrayBuffer());
      const filename = `wp_${Date.now()}_${s}.jpg`;
      const filePath = path.join(WALLPAPERS_DIR, filename);
      fs.writeFileSync(filePath, buffer);

      const host = req.get('host') || 'localhost:4000';
      const protocol = req.protocol || 'http';
      const fileUrl = `${protocol}://${host}/api/wallpapers/image/${filename}`;

      return res.json({
        success: true,
        url: fileUrl,
        engine: 'pollinations-backend-disk',
        width: w,
        height: h,
      });
    }
  } catch (pollErr) {
    console.warn('[Wallpapers] Pollinations request notice:', pollErr.message);
  }

  // 3. Fallback Curated 4K Cinema Aesthetic
  const fallbackUrl = resolveAestheticFallback(prompt, style);
  return res.json({
    success: true,
    url: fallbackUrl,
    engine: 'curated-4k-cinema',
    width: w,
    height: h,
    isCuratedFallback: true,
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

  res.setHeader('Content-Type', 'image/jpeg');
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
