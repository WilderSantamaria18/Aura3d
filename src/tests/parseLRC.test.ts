import { describe, it, expect } from 'vitest';
import { parseLRC } from '../utils/parseLRC';

describe('parseLRC - Synchronized Lyrics Parser', () => {
  it('should parse standard LRC format correctly', () => {
    const lrc = `
      [00:12.30]First line of the song
      [00:15.80]Second line of the song
      [01:02.100]Third line in next minute
    `;

    const result = parseLRC(lrc);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ time: 12.3, text: 'First line of the song' });
    expect(result[1]).toEqual({ time: 15.8, text: 'Second line of the song' });
    expect(result[2]).toEqual({ time: 62.1, text: 'Third line in next minute' });
  });

  it('should ignore metadata tags like [ti:], [ar:], [al:]', () => {
    const lrc = `
      [ti:Song Title]
      [ar:Artist Name]
      [al:Album Name]
      [00:05.00]Actual lyric line
    `;

    const result = parseLRC(lrc);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ time: 5, text: 'Actual lyric line' });
  });

  it('should return empty array on empty input or invalid content', () => {
    expect(parseLRC('')).toEqual([]);
    expect(parseLRC('Random text without timestamps')).toEqual([]);
  });

  it('should sort timestamps in chronological order', () => {
    const lrc = `
      [00:30.00]Later line
      [00:10.00]Earlier line
    `;

    const result = parseLRC(lrc);
    expect(result[0].text).toBe('Earlier line');
    expect(result[1].text).toBe('Later line');
  });
});
