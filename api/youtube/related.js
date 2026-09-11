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
  const artist = (req.query?.artist || '').toString().trim();
  const title = (req.query?.title || '').toString().trim();

  let results = [];

  try {
    // 1. Intentar raspar la página de visualización de YouTube para recomendaciones ("Up Next")
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
                if (results.length >= 12) break;
              }
            }
          }
        }
      } catch (e) {
        console.debug('[Vercel YouTube Related Scrape Error]:', e.message);
      }
    }

    // 2. Fallback: Si hay pocos resultados y tenemos el nombre del artista, buscar canciones populares del artista
    if (results.length < 4 && artist && artist !== 'YouTube Stream' && artist !== 'Artista de YouTube') {
      try {
        const query = `${artist} top songs`;
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
        });
        if (searchRes.ok) {
          const sHtml = await searchRes.text();
          const sMatch = sHtml.match(/var ytInitialData = ({.*?});<\/script>/);
          if (sMatch && sMatch[1]) {
            const sData = JSON.parse(sMatch[1]);
            const sContents =
              sData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
                ?.contents?.[0]?.itemSectionRenderer?.contents || [];

            for (const c of sContents) {
              const vr = c.videoRenderer;
              if (vr && vr.videoId && !vr.videoId.startsWith('UC') && vr.videoId !== videoId) {
                const vTitle = vr.title?.runs?.[0]?.text || 'Canción de YouTube';
                const vArtist =
                  vr.ownerText?.runs?.[0]?.text ||
                  vr.shortBylineText?.runs?.[0]?.text ||
                  artist;
                const vDur = parseDurationText(vr.lengthText?.simpleText);
                const vThumb =
                  vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                  `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`;

                results.push({
                  id: vr.videoId,
                  title: vTitle,
                  artist: vArtist,
                  duration: vDur,
                  thumbnail: vThumb,
                  url: `https://www.youtube.com/watch?v=${vr.videoId}`,
                });
                if (results.length >= 10) break;
              }
            }
          }
        }
      } catch (searchErr) {
        console.debug('[Vercel Related Search Fallback Error]:', searchErr.message);
      }
    }

    // 3. Filtrar duplicados y canciones con títulos idénticos a la actual
    const cleanTitle = title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const uniqueMap = new Map();

    for (const r of results) {
      if (r.id === videoId) continue;
      const rTitleClean = r.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

      // Evitar la misma canción o misma versión repetida
      if (cleanTitle.length > 3 && (rTitleClean.includes(cleanTitle) || cleanTitle.includes(rTitleClean))) {
        continue;
      }

      if (!uniqueMap.has(r.id) && !uniqueMap.has(rTitleClean)) {
        uniqueMap.set(r.id, r);
        uniqueMap.set(rTitleClean, r);
      }
    }

    const finalResults = Array.from(new Set(uniqueMap.values())).slice(0, 10);
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.status(200).json({ results: finalResults });
  } catch (err) {
    console.error('[Vercel YouTube Related Error]:', err);
    return res.status(500).json({ error: 'Error al obtener canciones similares', results: [] });
  }
}
