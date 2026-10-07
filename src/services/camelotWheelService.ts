/**
 * CamelotWheelService — Professional DJ Harmonic Mixing & Camelot Wheel Engine
 *
 * Implements the industry-standard Camelot Easymix system for DJs:
 * - Circle of Fifths mapping (1A-12A Minor, 1B-12B Major)
 * - Harmonic distance calculation (same key, relative major/minor, ±1 fifths, +2 energy boost, +7 semi-tone modulation)
 * - DJ Smart Sort: Nearest-neighbor traveling harmonic path algorithm with BPM glide penalty
 * - Energy & Tempo segmentation filters
 */

import type { Track } from '../types/audio';

export type CamelotMode = 'A' | 'B'; // A = Minor, B = Major

export interface ParsedCamelot {
  number: number; // 1 to 12
  mode: CamelotMode;
  raw: string; // e.g. "8A"
}

export type HarmonicCompatibilityLevel =
  | 'perfect'      // Same key or relative major/minor with ΔBPM ≤ 3
  | 'compatible'   // Adjacent ±1 fifth with ΔBPM ≤ 6
  | 'energy_boost' // +2 Camelot or controlled energy jump
  | 'modulation'   // +7 semitone lift
  | 'smooth'       // Harmonic with moderate tempo glide
  | 'vibe_shift';  // Distant tonal or tempo transition

export interface HarmonicCompatibility {
  keyA: string;
  keyB: string;
  bpmA: number;
  bpmB: number;
  bpmDelta: number;
  bpmChangePct: number;
  numberDistance: number;
  isSameKey: boolean;
  isRelative: boolean;
  isAdjacent: boolean;
  isEnergyBoost: boolean;
  isModulation: boolean;
  harmonicScore: number; // 0 to 100
  compatibilityLevel: HarmonicCompatibilityLevel;
  badgeLabel: string;
  badgeDetail: string;
  badgeTheme: 'emerald' | 'cyan' | 'amber' | 'purple' | 'slate';
  icon: 'sparkles' | 'check' | 'zap' | 'radio' | 'activity';
}

export type EnergyFilterType = 'all' | 'harmonic' | 'high_energy' | 'chill' | 'peak_time';

// 12 sectors of the Circle of Fifths with musical note equivalents
export const CAMELOT_KEY_MAP: Record<string, { major: string; minor: string; camelotMaj: string; camelotMin: string }> = {
  '1': { major: 'B', minor: 'G#m', camelotMaj: '1B', camelotMin: '1A' },
  '2': { major: 'F#', minor: 'D#m', camelotMaj: '2B', camelotMin: '2A' },
  '3': { major: 'Db', minor: 'Bbm', camelotMaj: '3B', camelotMin: '3A' },
  '4': { major: 'Ab', minor: 'Fm', camelotMaj: '4B', camelotMin: '4A' },
  '5': { major: 'Eb', minor: 'Cm', camelotMaj: '5B', camelotMin: '5A' },
  '6': { major: 'Bb', minor: 'Gm', camelotMaj: '6B', camelotMin: '6A' },
  '7': { major: 'F', minor: 'Dm', camelotMaj: '7B', camelotMin: '7A' },
  '8': { major: 'C', minor: 'Am', camelotMaj: '8B', camelotMin: '8A' },
  '9': { major: 'G', minor: 'Em', camelotMaj: '9B', camelotMin: '9A' },
  '10': { major: 'D', minor: 'Bm', camelotMaj: '10B', camelotMin: '10A' },
  '11': { major: 'A', minor: 'F#m', camelotMaj: '11B', camelotMin: '11A' },
  '12': { major: 'E', minor: 'C#m', camelotMaj: '12B', camelotMin: '12A' },
};

const NOTE_TO_CAMELOT: Record<string, string> = {
  // Minor
  'AM': '8A', 'A MINOR': '8A', 'LA MENOR': '8A',
  'EM': '9A', 'E MINOR': '9A', 'MI MENOR': '9A',
  'BM': '10A', 'B MINOR': '10A', 'SI MENOR': '10A',
  'F#M': '11A', 'GBM': '11A', 'F# MINOR': '11A',
  'C#M': '12A', 'DBM': '12A', 'C# MINOR': '12A',
  'G#M': '1A', 'ABM': '1A', 'G# MINOR': '1A',
  'D#M': '2A', 'EBM': '2A', 'D# MINOR': '2A',
  'BBM': '3A', 'A#M': '3A', 'BB MINOR': '3A',
  'FM': '4A', 'F MINOR': '4A', 'FA MENOR': '4A',
  'CM': '5A', 'C MINOR': '5A', 'DO MENOR': '5A',
  'GM': '6A', 'G MINOR': '6A', 'SOL MENOR': '6A',
  'DM': '7A', 'D MINOR': '7A', 'RE MENOR': '7A',

  // Major
  'C': '8B', 'C MAJOR': '8B', 'DO MAYOR': '8B',
  'G': '9B', 'G MAJOR': '9B', 'SOL MAYOR': '9B',
  'D': '10B', 'D MAJOR': '10B', 'RE MAYOR': '10B',
  'A': '11B', 'A MAJOR': '11B', 'LA MAYOR': '11B',
  'E': '12B', 'E MAJOR': '12B', 'MI MAYOR': '12B',
  'B': '1B', 'B MAJOR': '1B', 'SI MAYOR': '1B',
  'F#': '2B', 'GB': '2B', 'F# MAJOR': '2B',
  'DB': '3B', 'C#': '3B', 'DB MAJOR': '3B',
  'AB': '4B', 'G#': '4B', 'AB MAJOR': '4B',
  'EB': '5B', 'D#': '5B', 'EB MAJOR': '5B',
  'BB': '6B', 'A#': '6B', 'BB MAJOR': '6B',
  'F': '7B', 'F MAJOR': '7B', 'FA MAYOR': '7B',
};

class CamelotWheelService {
  private static instance: CamelotWheelService | null = null;

  public static getInstance(): CamelotWheelService {
    if (!CamelotWheelService.instance) {
      CamelotWheelService.instance = new CamelotWheelService();
    }
    return CamelotWheelService.instance;
  }

  /**
   * Parse a raw Camelot string (e.g. "8A", "11b", "Am", "c major")
   */
  public parseCamelot(raw?: string | null): ParsedCamelot | null {
    if (!raw) return null;
    const clean = raw.trim().toUpperCase();

    // Check direct Camelot format: 1A - 12B
    const match = clean.match(/^([1-9]|1[0-2])([AB])$/);
    if (match) {
      return {
        number: parseInt(match[1], 10),
        mode: match[2] as CamelotMode,
        raw: `${match[1]}${match[2]}`,
      };
    }

    // Check musical notation conversion
    if (NOTE_TO_CAMELOT[clean]) {
      return this.parseCamelot(NOTE_TO_CAMELOT[clean]);
    }

    return null;
  }

  /**
   * Deterministically estimate or retrieve BPM and Camelot key for any track.
   * If the track already has valid values, they are preserved.
   */
  public getTrackHarmonics(track?: Track | null): { bpm: number; camelotKey: string; parsed: ParsedCamelot } {
    if (!track) {
      return { bpm: 124, camelotKey: '8A', parsed: { number: 8, mode: 'A', raw: '8A' } };
    }

    let parsed = this.parseCamelot(track.camelotKey);
    let bpm = track.bpm && track.bpm > 40 && track.bpm < 220 ? Math.round(track.bpm) : 0;

    // If missing, synthesize deterministic musical parameters from track identity
    if (!parsed || bpm === 0) {
      const seedStr = `${track.id || ''}:${track.title || ''}:${track.artist || ''}:${track.duration || 180}`;
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      const absHash = Math.abs(hash);

      if (!parsed) {
        const num = (absHash % 12) + 1;
        const mode: CamelotMode = (absHash >> 4) % 2 === 0 ? 'A' : 'B';
        parsed = { number: num, mode, raw: `${num}${mode}` };
      }

      if (bpm === 0) {
        // Natural electronic/pop/club BPM distribution between 118 and 132 BPM
        bpm = 118 + (absHash % 15);
      }
    }

    return {
      bpm,
      camelotKey: parsed.raw,
      parsed,
    };
  }

  /**
   * Calculate harmonic distance between two Camelot numbers on the circular clock (1 to 12)
   */
  public getCircularDistance(numA: number, numB: number): number {
    const diff = Math.abs(numA - numB) % 12;
    return Math.min(diff, 12 - diff);
  }

  /**
   * Evaluate the harmonic and BPM relationship between two sequential tracks
   */
  public getCompatibility(trackA?: Track | null, trackB?: Track | null): HarmonicCompatibility {
    const harmA = this.getTrackHarmonics(trackA);
    const harmB = this.getTrackHarmonics(trackB);

    const bpmA = harmA.bpm;
    const bpmB = harmB.bpm;
    const bpmDelta = Math.abs(bpmB - bpmA);
    const bpmChangePct = bpmA > 0 ? ((bpmB - bpmA) / bpmA) * 100 : 0;

    const numA = harmA.parsed.number;
    const numB = harmB.parsed.number;
    const modeA = harmA.parsed.mode;
    const modeB = harmB.parsed.mode;

    const numberDistance = this.getCircularDistance(numA, numB);
    const isSameKey = numA === numB && modeA === modeB;
    const isRelative = numA === numB && modeA !== modeB;
    const isAdjacent = numberDistance === 1 && modeA === modeB;
    const isEnergyBoost = ((numA + 2 - 1) % 12 + 1) === numB && modeA === modeB;
    const isModulation = ((numA + 7 - 1) % 12 + 1) === numB;

    // Harmonic scoring (0-100)
    let score = 50;
    if (isSameKey) score = 100;
    else if (isRelative) score = 96;
    else if (isAdjacent) score = 90;
    else if (isEnergyBoost) score = 78;
    else if (isModulation) score = 74;
    else if (numberDistance === 2) score = 65;
    else score = Math.max(20, 50 - numberDistance * 6);

    // Tempo penalty: -3 points per BPM difference
    const tempoPenalty = Math.min(45, bpmDelta * 3.5);
    const finalScore = Math.max(10, Math.round(score - tempoPenalty));

    // Determine compatibility level and badge display
    let compatibilityLevel: HarmonicCompatibilityLevel = 'vibe_shift';
    let badgeLabel = '';
    let badgeDetail = '';
    let badgeTheme: 'emerald' | 'cyan' | 'amber' | 'purple' | 'slate' = 'slate';
    let icon: HarmonicCompatibility['icon'] = 'activity';

    const bpmSuffix = bpmDelta === 0 ? '±0 BPM' : `${bpmB >= bpmA ? '+' : '-'}${bpmDelta} BPM`;

    if ((isSameKey || isRelative) && bpmDelta <= 4) {
      compatibilityLevel = 'perfect';
      badgeLabel = `✦ Match Armónico Perfecto: ${harmA.camelotKey} ➔ ${harmB.camelotKey} (${bpmSuffix}) ✓`;
      badgeDetail = isSameKey ? 'Misma tonalidad · Cero choque armónico' : 'Relativo Mayor/Menor · Textura complementaria';
      badgeTheme = 'emerald';
      icon = 'sparkles';
    } else if ((isAdjacent || isSameKey || isRelative) && bpmDelta <= 6) {
      compatibilityLevel = 'compatible';
      badgeLabel = `✦ Match Armónico: ${harmA.camelotKey} ➔ ${harmB.camelotKey} (${bpmSuffix})`;
      badgeDetail = 'Paso de Quinta · Transición tonal natural';
      badgeTheme = 'cyan';
      icon = 'check';
    } else if (isEnergyBoost || (bpmDelta >= 5 && bpmDelta <= 10 && bpmB > bpmA)) {
      compatibilityLevel = 'energy_boost';
      badgeLabel = `⚡ Salto de Energía: ${harmA.camelotKey} ➔ ${harmB.camelotKey} (Δ ${bpmDelta} BPM)`;
      badgeDetail = 'Subida de tempo y brillo armónico en pista';
      badgeTheme = 'amber';
      icon = 'zap';
    } else if (isModulation) {
      compatibilityLevel = 'modulation';
      badgeLabel = `✦ Modulación Semitono: ${harmA.camelotKey} ➔ ${harmB.camelotKey} (${bpmSuffix})`;
      badgeDetail = 'Modulación cromática para clímax';
      badgeTheme = 'purple';
      icon = 'radio';
    } else if (bpmDelta <= 3) {
      compatibilityLevel = 'smooth';
      badgeLabel = `~ Beatmatch Suave: ${harmA.camelotKey} ➔ ${harmB.camelotKey} (${bpmSuffix})`;
      badgeDetail = 'Ritmo idéntico con modulación ambiental';
      badgeTheme = 'cyan';
      icon = 'activity';
    } else {
      compatibilityLevel = 'vibe_shift';
      badgeLabel = `~ Cambio de Vibe: ${harmA.camelotKey} ➔ ${harmB.camelotKey} (Δ ${bpmDelta} BPM)`;
      badgeDetail = 'Transición por corte o mezcla de break';
      badgeTheme = 'slate';
      icon = 'activity';
    }

    return {
      keyA: harmA.camelotKey,
      keyB: harmB.camelotKey,
      bpmA,
      bpmB,
      bpmDelta,
      bpmChangePct,
      numberDistance,
      isSameKey,
      isRelative,
      isAdjacent,
      isEnergyBoost,
      isModulation,
      harmonicScore: finalScore,
      compatibilityLevel,
      badgeLabel,
      badgeDetail,
      badgeTheme,
      icon,
    };
  }

  /**
   * DJ Smart Sort: Reorders the queue to maximize harmonic flow and tempo smoothness.
   * Keeps the track at `anchorIndex` (currently playing) at the top or at its position,
   * then computes a greedy optimal harmonic path across the remaining tracks.
   */
  public sortQueueHarmonically(queue: Track[], anchorIndex: number = 0): Track[] {
    if (queue.length <= 1) return [...queue];

    const safeAnchor = Math.max(0, Math.min(queue.length - 1, anchorIndex));
    const sorted: Track[] = [];

    // Tracks preceding the anchor remain unchanged
    for (let i = 0; i < safeAnchor; i++) {
      sorted.push(queue[i]);
    }

    // Anchor track
    const anchor = queue[safeAnchor];
    sorted.push(anchor);

    // Remaining tracks pool
    const remaining = queue.filter((_, idx) => idx > safeAnchor);

    let current = anchor;
    while (remaining.length > 0) {
      let bestIdx = 0;
      let highestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const comp = this.getCompatibility(current, candidate);

        // Preference scoring:
        // Harmonic match points (0 to 100)
        let routeScore = comp.harmonicScore;

        // Slight favor for gradual tempo progression (+0 to +3 BPM)
        if (comp.bpmB >= comp.bpmA && comp.bpmDelta <= 3) {
          routeScore += 12;
        }

        // Heavy penalty for extreme tempo jumps (> 15 BPM)
        if (comp.bpmDelta > 15) {
          routeScore -= 30;
        }

        if (routeScore > highestScore) {
          highestScore = routeScore;
          bestIdx = i;
        }
      }

      const nextTrack = remaining.splice(bestIdx, 1)[0];
      sorted.push(nextTrack);
      current = nextTrack;
    }

    return sorted;
  }

  /**
   * Filter tracks according to energy / harmonic state
   */
  public filterTracksByEnergy(
    tracks: Track[],
    filter: EnergyFilterType,
    referenceTrack?: Track | null
  ): Track[] {
    if (filter === 'all') return tracks;

    return tracks.filter((t) => {
      const harmonics = this.getTrackHarmonics(t);
      const bpm = harmonics.bpm;

      switch (filter) {
        case 'harmonic': {
          if (!referenceTrack) return true;
          const comp = this.getCompatibility(referenceTrack, t);
          return (
            comp.isSameKey ||
            comp.isRelative ||
            comp.isAdjacent ||
            comp.compatibilityLevel === 'perfect' ||
            comp.compatibilityLevel === 'compatible'
          );
        }
        case 'high_energy':
          return bpm >= 126;
        case 'chill':
          return bpm < 118;
        case 'peak_time':
          return bpm >= 125 && bpm <= 138;
        default:
          return true;
      }
    });
  }
}

export const camelotWheelService = CamelotWheelService.getInstance();
export default camelotWheelService;
