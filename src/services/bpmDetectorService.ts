import { usePlayerStore } from '../stores/playerStore';

class BpmDetectorService {
  private isRunning = false;
  private animId: number | null = null;
  private prevBassEnergy = 0;
  private energyHistory: number[] = [];
  private beatIntervals: number[] = [];
  private lastBeatTime = 0;
  private smoothedBpm = 0;
  private beatPulseTimeout: ReturnType<typeof setTimeout> | null = null;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const state = usePlayerStore.getState();
    const analyser = state.analyser;
    const isPlaying = state.isPlaying;

    if (analyser && isPlaying) {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Focus on bass kick region: ~40Hz to 160Hz (bins 1 to 7 for 512 FFT @ 44.1kHz)
      let currentBassEnergy = 0;
      const binCount = Math.min(8, bufferLength);
      for (let i = 1; i < binCount; i++) {
        currentBassEnergy += dataArray[i];
      }
      currentBassEnergy = currentBassEnergy / (binCount - 1);

      // Maintain rolling average energy (last 30 frames ~ 0.5s)
      this.energyHistory.push(currentBassEnergy);
      if (this.energyHistory.length > 30) {
        this.energyHistory.shift();
      }

      const avgEnergy =
        this.energyHistory.reduce((a, b) => a + b, 0) / (this.energyHistory.length || 1);

      // Onset detection: positive spectral flux above adaptive threshold
      const flux = currentBassEnergy - this.prevBassEnergy;
      const now = performance.now();
      const timeSinceLastBeat = now - this.lastBeatTime;

      // Dynamic threshold: 1.35x rolling average with minimal threshold of 45 (out of 255)
      const threshold = Math.max(45, avgEnergy * 1.32);

      // Minimum 260ms between beats (<= 230 BPM), maximum 1500ms (>= 40 BPM)
      if (currentBassEnergy > threshold && flux > 15 && timeSinceLastBeat > 260) {
        if (this.lastBeatTime > 0 && timeSinceLastBeat < 1500) {
          const rawBpm = 60000 / timeSinceLastBeat;

          // Normalize half-time / double-time to normal musical range (70 - 175 BPM)
          let normalizedBpm = rawBpm;
          if (normalizedBpm < 70) normalizedBpm *= 2;
          if (normalizedBpm > 175) normalizedBpm /= 2;

          this.beatIntervals.push(normalizedBpm);
          if (this.beatIntervals.length > 8) {
            this.beatIntervals.shift();
          }

          // Weighted median / average of recent beat intervals
          const sorted = [...this.beatIntervals].sort((a, b) => a - b);
          const medianBpm = sorted[Math.floor(sorted.length / 2)];

          if (this.smoothedBpm === 0) {
            this.smoothedBpm = medianBpm;
          } else {
            // Smooth transition to prevent jitter
            this.smoothedBpm += (medianBpm - this.smoothedBpm) * 0.25;
          }

          const roundedBpm = Math.round(this.smoothedBpm);
          state.setBpm(roundedBpm);
        }

        this.lastBeatTime = now;
        this.triggerBeatPulse();
      }

      this.prevBassEnergy = currentBassEnergy;
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private triggerBeatPulse(): void {
    const store = usePlayerStore.getState();
    store.triggerBeatPulse();

    if (this.beatPulseTimeout) {
      clearTimeout(this.beatPulseTimeout);
    }
    this.beatPulseTimeout = setTimeout(() => {
      usePlayerStore.getState().resetBeatPulse();
    }, 110);
  }
}

export const bpmDetector = new BpmDetectorService();
