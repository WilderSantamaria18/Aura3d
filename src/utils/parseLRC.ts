export interface LyricsLine {
  time: number; // in seconds
  text: string;
}

export const parseLRC = (lrcContent: string): LyricsLine[] => {
  if (!lrcContent) return [];
  const lines = lrcContent.split('\n');
  const result: LyricsLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata tags like [ti:Title], [ar:Artist], etc.
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) {
      continue;
    }

    const match = trimmed.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fractionStr = match[3] || '0';
      const fraction = fractionStr.length === 3 ? parseInt(fractionStr, 10) / 1000 : parseInt(fractionStr, 10) / 100;
      const time = minutes * 60 + seconds + fraction;
      const text = trimmed.replace(timeRegex, '').trim();

      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
};

