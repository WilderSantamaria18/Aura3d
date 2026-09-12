export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const remoteBackend = process.env.AURA_BACKEND_URL || process.env.BACKEND_URL;

  // 0. Soporte para chequeo rápido de capacidades desde el frontend sin generar error 503
  if (req.query?.check === '1' || req.query?.status === '1') {
    return res.status(200).json({
      hasBackend: !!remoteBackend,
      mode: remoteBackend ? 'native' : 'iframe',
    });
  }

  const videoId = (req.query?.v || req.query?.id || '').toString().trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{8,20}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de video requerido y válido' });
  }

  // 1. Si existe un backend con yt-dlp configurado en variables de entorno de Vercel
  if (remoteBackend) {
    const cleanUrl = remoteBackend.replace(/\/+$/, '');
    return res.redirect(307, `${cleanUrl}/api/youtube/stream?v=${videoId}`);
  }

  // Para peticiones HEAD rápidas desde el frontend, responder 204 o 503 según disponibilidad
  if (req.method === 'HEAD') {
    return res.status(remoteBackend ? 200 : 503).end();
  }

  // 2. Intentar obtener stream de audio a través de gateways públicos
  const gateways = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://api.piped.privacy.com.de/streams/${videoId}`,
    `https://piped-api.lunar.icu/streams/${videoId}`,
  ];

  for (const gw of gateways) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const gwRes = await fetch(gw, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (gwRes.ok) {
        const data = await gwRes.json();
        const audioStream = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (audioStream && audioStream.url) {
          return res.redirect(302, audioStream.url);
        }
      }
    } catch {
      // Continuar al siguiente gateway
    }
  }

  return res.status(503).json({
    error: 'Servicio de streaming no disponible en servidor serverless sin backend configurado.',
    message: 'Para reproducir audio directamente en producción, configure la variable de entorno AURA_BACKEND_URL con el servidor Node.js/yt-dlp.',
  });
}
