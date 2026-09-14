/**
 * Session Listening Stats Service for Aura3D
 * Tracks real-time listening analytics:
 * - Focus & Lo-Fi minutes vs high energy session
 * - Tracks completed
 * - Dominant Camelot harmonic keys
 * - Session duration
 */

import type { SessionStatsData } from '../types/audio';
import { usePlayerStore } from '../stores/playerStore';

class SessionStatsService {
  private static instance: SessionStatsService | null = null;
  private stats: SessionStatsData = {
    totalSeconds: 0,
    focusSeconds: 0,
    tracksPlayed: 0,
    keysDistribution: {},
    sessionStartTime: Date.now(),
  };

  private timerId: number | null = null;
  private lastTrackId: string | null = null;
  private listeners: ((stats: SessionStatsData) => void)[] = [];

  private constructor() {
    this.startTracking();
  }

  public static getInstance(): SessionStatsService {
    if (!SessionStatsService.instance) {
      SessionStatsService.instance = new SessionStatsService();
    }
    return SessionStatsService.instance;
  }

  public subscribe(cb: (stats: SessionStatsData) => void): () => void {
    this.listeners.push(cb);
    cb({ ...this.stats });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const copy = { ...this.stats, keysDistribution: { ...this.stats.keysDistribution } };
    this.listeners.forEach((cb) => cb(copy));
  }

  public getStats(): SessionStatsData {
    return { ...this.stats, keysDistribution: { ...this.stats.keysDistribution } };
  }

  public registerKey(camelotKey: string) {
    if (!camelotKey || camelotKey === '--') return;
    this.stats.keysDistribution[camelotKey] = (this.stats.keysDistribution[camelotKey] || 0) + 1;
    this.notify();
  }

  public resetStats() {
    this.stats = {
      totalSeconds: 0,
      focusSeconds: 0,
      tracksPlayed: 0,
      keysDistribution: {},
      sessionStartTime: Date.now(),
    };
    this.notify();
  }

  private startTracking() {
    if (this.timerId !== null) return;

    this.timerId = window.setInterval(() => {
      const state = usePlayerStore.getState();
      if (!state.isPlaying) return;

      this.stats.totalSeconds += 1;

      // Detect if in Focus / Lo-Fi mode (Soundscapes active or Lo-Fi/Slowed DSP active or Binaural beats)
      const isFocus =
        state.dspSpeedMode === 'slowed' ||
        state.binauralMode !== 'off' ||
        state.isUnderwaterActive;

      if (isFocus) {
        this.stats.focusSeconds += 1;
      }

      // Track new song playback
      const currentTrack = state.currentTrack;
      if (currentTrack) {
        const id = currentTrack.id || currentTrack.youtubeId || currentTrack.title;
        if (id && id !== this.lastTrackId) {
          this.lastTrackId = id;
          this.stats.tracksPlayed += 1;
        }
      }

      if (this.stats.totalSeconds % 5 === 0) {
        this.notify();
      }
    }, 1000);
  }
}

export const sessionStatsService = SessionStatsService.getInstance();
