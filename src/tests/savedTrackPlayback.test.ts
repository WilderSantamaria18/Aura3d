import { describe, expect, it } from 'vitest';
import type { Track } from '../types/audio';
import {
  buildSavedTrackSearchQuery,
  canPlaySavedTrackDirectly,
  createTrackFromYouTubeCandidate,
  scoreYouTubeCandidate,
  selectBestYouTubeCandidate,
  replaceResolvedFavorite,
} from '../utils/savedTrackPlayback';

const savedTrack: Track = {
  id: 'local_saved',
  title: 'Midnight City',
  artist: 'M83',
  duration: 0,
  sourceType: 'local',
  addedAt: 100,
  isFavorite: true,
};

describe('saved track YouTube playback', () => {
  it('searches stale local favorites by title and artist', () => {
    expect(canPlaySavedTrackDirectly(savedTrack)).toBe(false);
    expect(canPlaySavedTrackDirectly({ ...savedTrack, url: 'blob:http://localhost/expired' })).toBe(
      false
    );
    expect(buildSavedTrackSearchQuery(savedTrack)).toBe('Midnight City M83 audio');
  });

  it('does not pollute the query with a generic local artist', () => {
    expect(buildSavedTrackSearchQuery({ ...savedTrack, artist: 'Archivo local' })).toBe(
      'Midnight City audio'
    );
  });

  it('converts the first YouTube result into a persistent playable favorite', () => {
    const resolved = createTrackFromYouTubeCandidate(
      {
        id: 'dX3k_QDnzHE',
        title: 'M83 - Midnight City (Official Video)',
        artist: 'M83',
        duration: 244,
        thumbnail: 'https://example.com/cover.jpg',
      },
      savedTrack
    );

    expect(resolved).toMatchObject({
      id: 'local_saved',
      youtubeId: 'dX3k_QDnzHE',
      sourceType: 'youtube',
      duration: 244,
      isFavorite: true,
    });
    expect(resolved.file).toBeUndefined();
    expect(resolved.url).toBeUndefined();
  });

  it('prioritizes the official song over karaoke, remixes and long mixes', () => {
    const official = {
      id: 'official123',
      title: 'M83 - Midnight City (Official Audio)',
      artist: 'M83VEVO',
      duration: 245,
    };
    const candidates = [
      { id: 'karaoke123', title: 'Midnight City Karaoke', artist: 'Karaoke Hits', duration: 244 },
      { id: 'remix12345', title: 'M83 Midnight City slowed remix', artist: 'Night Mix', duration: 420 },
      { id: 'longmix1234', title: 'M83 Midnight City 1 hour mix', artist: 'Mixes', duration: 3600 },
      official,
    ];

    expect(scoreYouTubeCandidate(official, { ...savedTrack, duration: 244 })).toBeGreaterThan(
      scoreYouTubeCandidate(candidates[0], { ...savedTrack, duration: 244 })
    );
    expect(selectBestYouTubeCandidate(candidates, { ...savedTrack, duration: 244 })).toEqual(
      official
    );
  });

  it('excludes an unavailable video when selecting a replacement', () => {
    const candidates = [
      { id: 'blocked1234', title: 'Midnight City Official Audio', artist: 'M83' },
      { id: 'working1234', title: 'M83 - Midnight City', artist: 'M83' },
    ];
    expect(selectBestYouTubeCandidate(candidates, savedTrack, ['blocked1234'])?.id).toBe(
      'working1234'
    );
  });

  it('replaces the stale favorite and removes duplicate YouTube entries', () => {
    const resolved = createTrackFromYouTubeCandidate(
      { id: 'dX3k_QDnzHE', title: savedTrack.title, artist: savedTrack.artist },
      savedTrack
    );
    const duplicate = { ...resolved, id: 'old_duplicate' };

    expect(replaceResolvedFavorite([savedTrack, duplicate], savedTrack, resolved)).toEqual([resolved]);
  });

  it('keeps the favorite in its original list position after resolving it', () => {
    const before = { ...savedTrack, id: 'before', title: 'Before' };
    const after = { ...savedTrack, id: 'after', title: 'After' };
    const resolved = createTrackFromYouTubeCandidate(
      { id: 'dX3k_QDnzHE', title: savedTrack.title, artist: savedTrack.artist },
      savedTrack
    );

    expect(replaceResolvedFavorite([before, savedTrack, after], savedTrack, resolved)).toEqual([
      before,
      resolved,
      after,
    ]);
  });

  it('updates a broken YouTube favorite id when selecting an alternate video', () => {
    const brokenYouTubeFavorite = {
      ...savedTrack,
      id: 'yt_oldVideo01',
      youtubeId: 'oldVideo01',
      sourceType: 'youtube' as const,
    };
    const resolved = createTrackFromYouTubeCandidate(
      { id: 'newVideo02', title: savedTrack.title, artist: savedTrack.artist },
      brokenYouTubeFavorite
    );

    expect(resolved.id).toBe('yt_newVideo02');
    expect(resolved.youtubeId).toBe('newVideo02');
  });
});
