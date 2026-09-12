export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query.q || req.query.query || '').toString().trim();
  const searchType = (req.query.type || 'video').toString().trim(); // 'video' | 'playlist'

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Término de búsqueda requerido (mínimo 2 caracteres)', results: [] });
  }

  try {
    const isPlaylistSearch = searchType === 'playlist';
    const filterParam = isPlaylistSearch ? '&sp=EgIQAw%253D%253D' : '';
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      isPlaylistSearch ? `${query} playlist` : query
    )}${filterParam}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return res.status(200).json({ results: [] });
    }

    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) {
      return res.status(200).json({ results: [] });
    }

    const parsed = JSON.parse(match[1]);
    const contents =
      parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
        ?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const results = [];
    for (const c of contents) {
      if (isPlaylistSearch) {
        const pr = c.playlistRenderer;
        if (pr && pr.playlistId) {
          const title = pr.title?.simpleText || pr.title?.runs?.[0]?.text || 'Playlist de YouTube';
          const artist =
            pr.shortBylineText?.runs?.[0]?.text ||
            pr.ownerText?.runs?.[0]?.text ||
            'YouTube Music';
          const count = pr.videoCount || pr.thumbnailText?.runs?.[0]?.text || 'Varios temas';
          const thumb =
            pr.thumbnails?.[0]?.thumbnails?.slice(-1)[0]?.url ||
            pr.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            '';

          results.push({
            id: pr.playlistId,
            title,
            artist,
            videoCount: count,
            type: 'playlist',
            thumbnail: thumb,
            url: `https://www.youtube.com/playlist?list=${pr.playlistId}`,
          });
          if (results.length >= 15) break;
        }
      } else {
        const vr = c.videoRenderer;
        if (vr && vr.videoId && !vr.videoId.startsWith('UC')) {
          const title = vr.title?.runs?.[0]?.text || 'Canción de YouTube';
          const artist =
            vr.ownerText?.runs?.[0]?.text ||
            vr.shortBylineText?.runs?.[0]?.text ||
            'Artista de YouTube';

          let durationSec = 0;
          const durText = vr.lengthText?.simpleText;
          if (durText) {
            const parts = durText.split(':').map(Number);
            if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
          }

          const thumb =
            vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`;

          results.push({
            id: vr.videoId,
            title,
            artist,
            duration: durationSec,
            type: 'video',
            thumbnail: thumb,
            url: `https://www.youtube.com/watch?v=${vr.videoId}`,
          });
          if (results.length >= 20) break;
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ results });
  } catch (err) {
    console.error('[Vercel YouTube Search Error]:', err);
    return res.status(500).json({ error: 'Error al buscar en YouTube', results: [] });
  }
}
