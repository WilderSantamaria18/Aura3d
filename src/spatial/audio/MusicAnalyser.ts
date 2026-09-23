/**
 * MusicAnalyser — Analizador exclusivo para el flujo de la canción (MusicBus).
 * Garantiza que la música mande en el visualizador 3D principal sin interferencias.
 */

export class MusicAnalyser {
  private analyser: AnalyserNode;
  private freqData: Uint8Array;
  private timeData: Uint8Array;
  private prevFreqData: Uint8Array;

  constructor(ctx: AudioContext, fftSize: number = 512, smoothingTimeConstant: number = 0.8) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = smoothingTimeConstant;

    const binCount = this.analyser.frequencyBinCount;
    this.freqData = new Uint8Array(binCount);
    this.timeData = new Uint8Array(binCount);
    this.prevFreqData = new Uint8Array(binCount);
  }

  public getNode(): AnalyserNode {
    return this.analyser;
  }

  public update(): {
    freqData: Uint8Array;
    timeData: Uint8Array;
    energy: number;
    bass: number;
    mids: number;
    highs: number;
    spectralFlux: number;
  } {
    this.analyser.getByteFrequencyData(this.freqData as any);
    this.analyser.getByteTimeDomainData(this.timeData as any);

    const length = this.freqData.length;
    let sum = 0;
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let flux = 0;

    const bassEnd = Math.floor(length * 0.12);
    const midEnd = Math.floor(length * 0.50);

    for (let i = 0; i < length; i++) {
      const val = this.freqData[i];
      sum += val;

      const diff = val - this.prevFreqData[i];
      if (diff > 0) flux += diff;
      this.prevFreqData[i] = val;

      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    const energy = sum / (length * 255);
    const bass = bassSum / (Math.max(1, bassEnd) * 255);
    const mids = midSum / (Math.max(1, midEnd - bassEnd) * 255);
    const highs = highSum / (Math.max(1, length - midEnd) * 255);
    const spectralFlux = flux / (length * 255);

    return {
      freqData: this.freqData,
      timeData: this.timeData,
      energy,
      bass,
      mids,
      highs,
      spectralFlux,
    };
  }

  public getFrequencyBinCount(): number {
    return this.analyser.frequencyBinCount;
  }
}
