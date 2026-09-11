function parseDurationText(str) {
  if (!str) return 0;
  const parts = str.toString().trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = (req.query?.v || req.query?.id || '').toString().trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{8,20}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de video requerido y válido' });
  }

  let title = 'Canción de YouTube';
  let artist = 'Artista de YouTube';
  let duration = 0;
  let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    // 1. YouTube oEmbed (Rápido y oficial)
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) artist = oembed.author_name;
      if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
    }

    // 2. Extraer duración precisa de la página del video si es posible
    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const watchRes = await fetch(watchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });
      clearTimeout(timeoutId);

      if (watchRes.ok) {
        const html = await watchRes.text();
        const durMatch = html.match(/"approxDurationMs":"(\d+)"/);
        if (durMatch && durMatch[1]) {
          duration = Math.round(parseInt(durMatch[1], 10) / 1000);
        } else {
          const simpleDurMatch = html.match(/"lengthSeconds":"(\d+)"/);
          if (simpleDurMatch && simpleDurMatch[1]) {
            duration = parseInt(simpleDurMatch[1], 10);
          }
        }
      }
    } catch {
      // Si la duración no se pudo extraer, duration = 0 (el reproductor Web Audio lo deduce al cargar)
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).json({
      id: videoId,
      title,
      artist,
      duration,
      thumbnail,
    });
  } catch (err) {
    console.error('[Vercel YouTube Info Error]:', err);
    return res.status(200).json({
      id: videoId,
      title,
      artist,
      duration: 0,
      thumbnail,
    });
  }
}
