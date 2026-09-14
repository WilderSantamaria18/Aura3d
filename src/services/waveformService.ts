/**
 * Waveform Service for Auralis Studio
 * Provides RMS/Peak waveform generation and intelligent Drop/Build-up detection
 */

export interface DropMarker {
  timePct: number;      // 0 to 100 percentage
  timestampSec: number; // in seconds
  label: string;
  energyLevel: number;  // 0 to 1
}

export interface WaveformData {
  peaks: number[];      // 0 to 1 normalized amplitude per bar (typically 80-120 bars)
  drops: DropMarker[];  // Detected drops / high energy transitions
  duration: number;
}

class WaveformService {
  private static instance: WaveformService | null = null;
  private cache = new Map<string, WaveformData>();

  public static getInstance(): WaveformService {
    if (!WaveformService.instance) {
      WaveformService.instance = new WaveformService();
    }
    return WaveformService.instance;
  }

  /**
   * Generates exact waveform peaks and detects drops from a decoded AudioBuffer
   */
  public generateFromAudioBuffer(buffer: AudioBuffer, numBars = 100): WaveformData {
    const rawData = buffer.getChannelData(0); // Left channel or mono
    const totalSamples = rawData.length;
    const blockSize = Math.floor(totalSamples / numBars);
    const peaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      let sumSq = 0;
      let maxPeak = 0;

      for (let j = start; j < end; j += 4) { // stride of 4 for speed
        const val = Math.abs(rawData[j]);
        if (val > maxPeak) maxPeak = val;
        sumSq += val * val;
      }

      const rms = Math.sqrt(sumSq / ((end - start) / 4));
      // Blend peak and RMS for a crisp, punchy waveform shape
      const blended = Math.min(1.0, Math.max(0.08, rms * 0.6 + maxPeak * 0.4));
      peaks.push(blended);
    }

    // Normalize peaks
    const maxVal = Math.max(...peaks, 0.1);
    const normalizedPeaks = peaks.map((p) => Math.min(1.0, p / maxVal));

    // Detect Drops (sections where energy jumps after a buildup or sudden burst)
    const drops = this.detectDrops(normalizedPeaks, buffer.duration);

    return {
      peaks: normalizedPeaks,
      drops,
      duration: buffer.duration,
    };
  }

  /**
   * Deterministically generates a realistic musical waveform for stream / fallback audio
   * based on a track identifier or title, so the waveform has consistent peaks and drops
   */
  public generateDeterministic(trackKey: string, duration = 210, numBars = 100): WaveformData {
    const cached = this.cache.get(trackKey);
    if (cached) return cached;

    // Simple hash from trackKey
    let hash = 0;
    for (let i = 0; i < trackKey.length; i++) {
      hash = (hash << 5) - hash + trackKey.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) || 42;

    const peaks: number[] = [];
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seed + n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    // Standard electronic/pop track structure simulation:
    // Intro (0-15%) -> Verse 1 (15-30%) -> Buildup (30-38%) -> Drop 1 (38-55%) ->
    // Breakdown (55-68%) -> Buildup 2 (68-75%) -> Drop 2 (75-90%) -> Outro (90-100%)
    for (let i = 0; i < numBars; i++) {
      const progress = i / numBars;
      let baseEnergy = 0.3;

      if (progress < 0.15) {
        // Intro: low to medium
        baseEnergy = 0.25 + progress * 1.5;
      } else if (progress < 0.30) {
        // Verse: steady
        baseEnergy = 0.45 + Math.sin(progress * 20) * 0.1;
      } else if (progress < 0.38) {
        // Buildup 1: rising energy
        baseEnergy = 0.5 + (progress - 0.30) * 4.5;
      } else if (progress < 0.55) {
        // Drop 1: Maximum energy & kicks
        baseEnergy = 0.85 + Math.sin(progress * 40) * 0.12;
      } else if (progress < 0.68) {
        // Breakdown: serene dip
        baseEnergy = 0.35 + Math.sin(progress * 15) * 0.1;
      } else if (progress < 0.76) {
        // Buildup 2: rising
        baseEnergy = 0.55 + (progress - 0.68) * 4.8;
      } else if (progress < 0.90) {
        // Drop 2: Climax
        baseEnergy = 0.92 + Math.sin(progress * 45) * 0.08;
      } else {
        // Outro: fade down
        baseEnergy = 0.5 - (progress - 0.90) * 3.5;
      }

      // Add high frequency micro-dynamics
      const noise = pseudoRandom(i) * 0.25 - 0.12;
      const finalVal = Math.min(1.0, Math.max(0.12, baseEnergy + noise));
      peaks.push(finalVal);
    }

    const drops = this.detectDrops(peaks, duration);
    const result: WaveformData = { peaks, drops, duration };
    this.cache.set(trackKey, result);
    return result;
  }

  /**
   * Identifies Drop moments where a sharp rise follows a drop or buildup
   */
  private detectDrops(peaks: number[], duration: number): DropMarker[] {
    const drops: DropMarker[] = [];
    const windowSize = 4;

    for (let i = windowSize; i < peaks.length - windowSize; i++) {
      const prevAvg = peaks.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize;
      const currVal = peaks[i];
      const nextAvg = peaks.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize;

      // Drop condition: high energy (> 0.75) with sharp delta from previous buildup dip
      if (currVal > 0.78 && nextAvg > 0.75 && prevAvg < 0.65) {
        const timePct = (i / peaks.length) * 100;
        const timestampSec = (timePct / 100) * duration;

        // Ensure drops are spaced at least 25s apart
        const tooClose = drops.some((d) => Math.abs(d.timestampSec - timestampSec) < 25);
        if (!tooClose) {
          drops.push({
            timePct,
            timestampSec,
            label: `Drop ${drops.length + 1}`,
            energyLevel: currVal,
          });
        }
      }
    }

    // Fallback: If no sharp drop was detected automatically, place standard musical drop points
    if (drops.length === 0 && duration > 40) {
      drops.push({
        timePct: 38,
        timestampSec: 0.38 * duration,
        label: 'Drop 1',
        energyLevel: 0.9,
      });
      if (duration > 90) {
        drops.push({
          timePct: 76,
          timestampSec: 0.76 * duration,
          label: 'Drop 2',
          energyLevel: 0.95,
        });
      }
    }

    return drops;
  }
}

export const waveformService = WaveformService.getInstance();
