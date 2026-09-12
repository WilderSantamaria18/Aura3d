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
  const currentDuration = parseInt(req.query?.duration || '0', 10);

  // Determinar si la pista actual es un video largo / mix / set (> 15 min o con palabras clave de mix)
  const isMixFormat =
    currentDuration > 900 ||
    /mix|dj set|sesi[oó]n|1 hora|2 horas|1 hour|2 hours|live set|enganchado|compil/i.test(title);

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

    // 2. Extraer paquetes masivos de canciones adaptados al formato (Canción individual vs Mix largo)
    const searchTasks = [];
    if (artist && artist !== 'YouTube Stream' && artist !== 'Artista de YouTube') {
      if (isMixFormat) {
        // Formato largo / Mix: relacionar otros sets, sesiones y compilaciones
        searchTasks.push(
          searchYouTubeQuery(`${artist} mix 1 hora`, 30),
          searchYouTubeQuery(`${artist} dj set live session`, 30),
          searchYouTubeQuery(`${artist} enganchado mix completo`, 25)
        );
      } else {
        // Canción estándar (3-4 min): estrictamente canciones individuales del artista, NO mixes de 1 hora
        searchTasks.push(
          searchYouTubeQuery(`${artist} canciones oficiales`, 30),
          searchYouTubeQuery(`${artist} mejores exitos singles`, 30),
          searchYouTubeQuery(`${artist} top tracks audio`, 30),
          searchYouTubeQuery(`${artist} discografia temas`, 25)
        );
      }
    } else if (title) {
      const cleanT = title.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      if (isMixFormat) {
        searchTasks.push(
          searchYouTubeQuery(`${cleanT} mix similar`, 30),
          searchYouTubeQuery(`${cleanT} dj set completo`, 30)
        );
      } else {
        searchTasks.push(
          searchYouTubeQuery(`${cleanT} canciones similares audio`, 30),
          searchYouTubeQuery(`${cleanT} musica similar singles`, 30)
        );
      }
    }

    if (searchTasks.length > 0) {
      const taskResults = await Promise.all(searchTasks);
      taskResults.forEach((arr) => results.push(...arr));
    }

    // 3. Filtrar según formato y eliminar duplicados
    const cleanCurrentTitle = title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const uniqueMap = new Map();

    const isLongTitle = (t) =>
      /mix|dj set|sesi[oó]n|1 hora|2 horas|1 hour|2 hours|album completo|full album|compilation|enganchado|non stop|megamix/i.test(t);

    for (const r of results) {
      if (r.id === videoId) continue;
      const rTitleClean = r.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

      // Evitar repetir la misma canción
      if (
        cleanCurrentTitle.length > 3 &&
        (rTitleClean === cleanCurrentTitle ||
          (rTitleClean.includes(cleanCurrentTitle) && rTitleClean.length < cleanCurrentTitle.length + 8))
      ) {
        continue;
      }

      // Regla de Oro: Si la canción que escucho es estándar (3-4 min), rechazar mixes largos de más de 12 min
      if (!isMixFormat) {
        if (r.duration > 720 || isLongTitle(r.title)) {
          continue; // descartar mixes de 1 hora o sets
        }
      } else {
        // Si la canción que escucho es un Mix largo, priorizar videos de más de 10 minutos
        if (r.duration > 0 && r.duration < 420 && !isLongTitle(r.title)) {
          continue; // descartar canciones cortas de 3 min si estamos en modo mix
        }
      }

      if (!uniqueMap.has(r.id) && !uniqueMap.has(rTitleClean)) {
        uniqueMap.set(r.id, r);
        uniqueMap.set(rTitleClean, r);
      }
    }

    // Devolver hasta 75 canciones
    const finalResults = Array.from(new Set(uniqueMap.values())).slice(0, 75);

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({ results: finalResults });
  } catch (err) {
    console.error('[Vercel YouTube Related Error]:', err);
    return res.status(500).json({ error: 'Error al obtener canciones similares', results: [] });
  }
}
