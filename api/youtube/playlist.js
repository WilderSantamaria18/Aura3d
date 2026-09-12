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

  const playlistId = (req.query.id || req.query.list || '').toString().trim().replace(/^VL/, '');
  if (!playlistId) {
    return res.status(400).json({ error: 'ID de playlist requerido', tracks: [] });
  }

  // ── 1. Si el usuario configuró YOUTUBE_API_KEY oficial de Google Cloud ─────
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(
        playlistId
      )}&key=${apiKey}`;

      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        const tracks = (data.items || [])
          .filter((item) => item.snippet?.resourceId?.videoId)
          .map((item) => {
            const vId = item.snippet.resourceId.videoId;
            const thumb =
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url ||
              `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

            return {
              id: `yt_${vId}`,
              title: item.snippet.title || 'Canción de Playlist',
              artist:
                item.snippet.videoOwnerChannelTitle ||
                item.snippet.channelTitle ||
                'Artista de YouTube',
              duration: 0,
              sourceType: 'youtube',
              youtubeId: vId,
              thumbnail: thumb,
              coverUrl: thumb,
              url: `https://www.youtube.com/watch?v=${vId}`,
            };
          });

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).json({
          playlistId,
          count: tracks.length,
          tracks,
          source: 'official-api',
        });
      }
    } catch (apiErr) {
      console.warn('[YouTube API v3 playlistItems error, falling back to autonomous engine]:', apiErr);
    }
  }

  // ── 2. Fallback autónomo sin límite de cuotas ──────────────────────────────
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
        ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

    const tracks = [];
    for (const item of tabContents) {
      const pvr = item.playlistVideoRenderer;
      const lm = item.lockupViewModel;

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
      } else if (lm && lm.contentId && /^[a-zA-Z0-9_-]{11}$/.test(lm.contentId)) {
        const title = lm.metadata?.lockupMetadataViewModel?.title?.content || 'Canción de Playlist';
        const artist =
          lm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content ||
          'Artista de YouTube';
        const durText =
          lm.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text ||
          '';
        const durationSec = parseDurationText(durText);
        const thumb =
          lm.contentImage?.thumbnailViewModel?.image?.sources?.slice(-1)[0]?.url ||
          `https://img.youtube.com/vi/${lm.contentId}/hqdefault.jpg`;

        tracks.push({
          id: `yt_${lm.contentId}`,
          title,
          artist,
          duration: durationSec,
          sourceType: 'youtube',
          youtubeId: lm.contentId,
          thumbnail: thumb,
          coverUrl: thumb,
          url: `https://www.youtube.com/watch?v=${lm.contentId}`,
        });
      }

      if (tracks.length >= 60) break;
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ playlistId, count: tracks.length, tracks });
  } catch (err) {
    console.error('[Vercel YouTube Playlist Error]:', err);
    return res.status(500).json({ error: 'Error al obtener canciones de la playlist', tracks: [] });
  }
}
