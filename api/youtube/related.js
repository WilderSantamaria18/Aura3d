function parseDurationText(str) {
  if (!str) return 0;
  const parts = str.toString().trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

async function searchYouTubeQuery(query, max = 35) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) return [];

    const parsed = JSON.parse(match[1]);
    const contents =
      parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const list = [];
    for (const c of contents) {
      const vr = c.videoRenderer;
      if (vr && vr.videoId && !vr.videoId.startsWith('UC')) {
        const title = vr.title?.runs?.[0]?.text || 'Canción de YouTube';
        const artist =
          vr.ownerText?.runs?.[0]?.text ||
          vr.shortBylineText?.runs?.[0]?.text ||
          'Artista de YouTube';
        const durationSec = parseDurationText(vr.lengthText?.simpleText);
        const thumb =
          vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`;

        list.push({
          id: vr.videoId,
          title,
          artist,
          duration: durationSec,
          thumbnail: thumb,
          url: `https://www.youtube.com/watch?v=${vr.videoId}`,
        });
        if (list.length >= max) break;
      }
    }
    return list;
  } catch (err) {
    console.debug('[searchYouTubeQuery error]:', err.message);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = (req.query?.v || req.query?.id || '').toString().trim();
  const artist = (req.query?.artist || '').toString().trim();
  const title = (req.query?.title || '').toString().trim();

  const results = [];

  try {
    // 1. Raspar la página de reproducción para obtener recomendaciones directas ("Up Next" y videos relacionados)
    if (videoId) {
      try {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

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
          const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            const secondaryItems =
              data.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results ||
              [];

            for (const item of secondaryItems) {
              const compact = item.compactVideoRenderer;
              if (compact && compact.videoId && compact.videoId !== videoId) {
                const itemTitle = compact.title?.simpleText || compact.title?.runs?.[0]?.text || '';
                const itemArtist =
                  compact.shortBylineText?.runs?.[0]?.text ||
                  compact.ownerText?.runs?.[0]?.text ||
                  artist ||
                  'Artista de YouTube';
                const dur = parseDurationText(compact.lengthText?.simpleText);
                const thumb =
                  compact.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                  `https://img.youtube.com/vi/${compact.videoId}/hqdefault.jpg`;

                results.push({
                  id: compact.videoId,
                  title: itemTitle,
                  artist: itemArtist,
                  duration: dur,
                  thumbnail: thumb,
                  url: `https://www.youtube.com/watch?v=${compact.videoId}`,
                });
                if (results.length >= 35) break;
              }
            }
          }
        }
      } catch (e) {
        console.debug('[Vercel YouTube Related Scrape Error]:', e.message);
      }
    }

    // 2. Extraer paquetes masivos de canciones del mismo artista y género para garantizar 50+ canciones
    const searchTasks = [];
    if (artist && artist !== 'YouTube Stream' && artist !== 'Artista de YouTube') {
      searchTasks.push(
        searchYouTubeQuery(`${artist} canciones mejores exitos`, 30),
        searchYouTubeQuery(`${artist} top tracks audio`, 30),
        searchYouTubeQuery(`${artist} playlist completo album`, 30),
        searchYouTubeQuery(`${artist} mix radio similar`, 25)
      );
    } else if (title) {
      const cleanT = title.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      searchTasks.push(
        searchYouTubeQuery(`${cleanT} canciones similares mix`, 30),
        searchYouTubeQuery(`${cleanT} playlist radio`, 30)
      );
    }

    if (searchTasks.length > 0) {
      const taskResults = await Promise.all(searchTasks);
      taskResults.forEach((arr) => results.push(...arr));
    }

    // 3. Filtrar duplicados por ID y por título de canción para asegurar que sean todas distintas
    const cleanCurrentTitle = title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const uniqueMap = new Map();

    for (const r of results) {
      if (r.id === videoId) continue;
      const rTitleClean = r.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

      // Evitar que la misma canción o misma versión repetida se agregue
      if (cleanCurrentTitle.length > 3 && (rTitleClean === cleanCurrentTitle || (rTitleClean.includes(cleanCurrentTitle) && rTitleClean.length < cleanCurrentTitle.length + 8))) {
        continue;
      }

      if (!uniqueMap.has(r.id) && !uniqueMap.has(rTitleClean)) {
        uniqueMap.set(r.id, r);
        uniqueMap.set(rTitleClean, r);
      }
    }

    // Devolver hasta 75 canciones para que la fila/cola tenga al menos 50-70 canciones completas
    const finalResults = Array.from(new Set(uniqueMap.values())).slice(0, 75);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({ results: finalResults });
  } catch (err) {
    console.error('[Vercel YouTube Related Error]:', err);
    return res.status(500).json({ error: 'Error al obtener canciones similares', results: [] });
  }
}
