export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const playlistId = (req.query.id || req.query.list || '').toString().trim();
  if (!playlistId) {
    return res.status(400).json({ error: 'ID de playlist requerido', tracks: [] });
  }

  try {
    const url = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      return res.status(200).json({ tracks: [] });
    }

    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) {
      return res.status(200).json({ tracks: [] });
    }

    const parsed = JSON.parse(match[1]);
    const tabContents =
      parsed.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
        ?.playlistVideoListRenderer?.contents || [];

    const tracks = [];
    for (const item of tabContents) {
      const pvr = item.playlistVideoRenderer;
      if (pvr && pvr.videoId) {
        const title = pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || 'Canción de Playlist';
        const artist =
          pvr.shortBylineText?.runs?.[0]?.text ||
          pvr.ownerText?.runs?.[0]?.text ||
          'Artista de YouTube';
        const durationSec = parseInt(pvr.lengthSeconds || '0', 10);
        const thumb =
          pvr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          `https://img.youtube.com/vi/${pvr.videoId}/hqdefault.jpg`;

        tracks.push({
          id: `yt_${pvr.videoId}`,
          title,
          artist,
          duration: durationSec,
          sourceType: 'youtube',
          youtubeId: pvr.videoId,
          thumbnail: thumb,
          coverUrl: thumb,
          url: `https://www.youtube.com/watch?v=${pvr.videoId}`,
        });
        if (tracks.length >= 50) break;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ playlistId, count: tracks.length, tracks });
  } catch (err) {
    console.error('[Vercel YouTube Playlist Error]:', err);
    return res.status(500).json({ error: 'Error al obtener canciones de la playlist', tracks: [] });
  }
}
