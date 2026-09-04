/**
 * Light Machine Learning / DSP Audio Genre Classification Engine
 * Analyzes real-time spectral distribution, sub-bass energy, mid-range vocal harmonics,
 * and high-frequency sizzle to identify musical genres in real time.
 */

export interface GenrePrediction {
  genre: string;
  confidence: number;
  energyLevel: 'low' | 'medium' | 'high' | 'ultra';
  dominantBand: 'bass' | 'mids' | 'highs';
  color: string;
}

export class GenreClassifier {
  private static history: string[] = [];
  private static maxHistory = 15;

  /**
   * Classify musical genre from normalized FFT frequency bands
   */
  public static classify(
    bass: number,
    mids: number,
    highs: number,
    energy: number,
    rawSpectrum?: Uint8Array
  ): GenrePrediction {
    // 1. Analyze Sub-bass (first 4 bins) vs High-Treble (last 8 bins) if spectrum is present
    let subBass = bass;
    let airHighs = highs;

    if (rawSpectrum && rawSpectrum.length >= 16) {
      const subSum = rawSpectrum[0] + rawSpectrum[1] + rawSpectrum[2] + rawSpectrum[3];
      subBass = subSum / (4 * 255);

      let highSum = 0;
      const highBins = Math.min(8, rawSpectrum.length);
      for (let i = rawSpectrum.length - highBins; i < rawSpectrum.length; i++) {
        highSum += rawSpectrum[i];
      }
      airHighs = highSum / (highBins * 255);
    }

    // 2. Compute spectral balance ratios
    const totalEnergy = bass + mids + highs + 0.0001;
    const bassRatio = bass / totalEnergy;
    const midsRatio = mids / totalEnergy;
    const highsRatio = highs / totalEnergy;

    let predictedGenre = 'Pop / Moderno';
    let confidence = 0.75;
    let color = '#00f2fe';

    // 3. Heuristic / ML Rule Matcher
    if (subBass > 0.65 && (highs > 0.45 || airHighs > 0.45) && energy > 0.5) {
      predictedGenre = 'Electrónica / EDM';
      confidence = Math.min(0.98, 0.75 + subBass * 0.2);
      color = '#00ffb3';
    } else if (bassRatio > 0.48 && midsRatio < 0.32) {
      predictedGenre = 'Hip-Hop / Trap';
      confidence = Math.min(0.95, 0.7 + bassRatio * 0.25);
      color = '#ff088a';
    } else if (bass > 0.5 && mids > 0.42 && energy > 0.45 && highs < 0.5) {
      predictedGenre = 'Reggaeton / Urbano';
      confidence = Math.min(0.92, 0.7 + mids * 0.2);
      color = '#ff5e00';
    } else if (midsRatio > 0.45 && energy > 0.6) {
      predictedGenre = 'Rock / Metal';
      confidence = Math.min(0.94, 0.72 + midsRatio * 0.22);
      color = '#ff0055';
    } else if (highsRatio > 0.42 && bass < 0.28) {
      predictedGenre = 'Clásica / Acústica';
      confidence = Math.min(0.96, 0.78 + highsRatio * 0.18);
      color = '#c471ed';
    } else if (energy < 0.25 && bass < 0.35) {
      predictedGenre = 'Ambient / Chill';
      confidence = 0.82;
      color = '#39FF14';
    } else if (mids > 0.35 && highs > 0.35) {
      predictedGenre = 'Pop / Disco';
      confidence = 0.85;
      color = '#ffe600';
    }

    // 4. Temporal Smoothing: Exponential majority vote over history
    this.history.push(predictedGenre);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Find most frequent genre in recent history
    const counts: Record<string, number> = {};
    let dominantGenre = predictedGenre;
    let maxCount = 0;

    this.history.forEach((g) => {
      counts[g] = (counts[g] || 0) + 1;
      if (counts[g] > maxCount) {
        maxCount = counts[g];
        dominantGenre = g;
      }
    });

    // 5. Determine dominant frequency band & energy level
    const dominantBand: 'bass' | 'mids' | 'highs' =
      bass >= mids && bass >= highs ? 'bass' : mids >= highs ? 'mids' : 'highs';

    const energyLevel: 'low' | 'medium' | 'high' | 'ultra' =
      energy > 0.8 ? 'ultra' : energy > 0.5 ? 'high' : energy > 0.25 ? 'medium' : 'low';

    return {
      genre: dominantGenre,
      confidence,
      energyLevel,
      dominantBand,
      color,
    };
  }
}
