/**
 * Gamification & User Performance Engine
 * Computes live Intensity Score (0-100) based on body movement velocity and audio volume,
 * tracks dancer ranks, combo multipliers, and estimated calorie burn.
 */

export interface DancerRank {
  tier: 'D' | 'C' | 'B' | 'A' | 'S' | 'S+';
  title: string;
  color: string;
  badge: string;
}

export interface GamificationState {
  score: number;             // 0 - 100
  smoothedScore: number;     // 0 - 100
  highScore: number;         // Session peak
  allTimeHighScore: number;  // LocalStorage record
  combo: number;             // 1.0x - 3.5x multiplier
  rank: DancerRank;
  estimatedCalories: number; // kcal
  isHyperActive: boolean;    // score > 70 (Lucid trigger)
  isIdle: boolean;           // score < 30 (Dimmer trigger)
}

export const DANCER_RANKS: Record<string, DancerRank> = {
  'S+': { tier: 'S+', title: 'CYBER DANCER', color: '#ff088a', badge: '👑' },
  S: { tier: 'S', title: 'RHYTHM GOD', color: '#00f2fe', badge: '⚡' },
  A: { tier: 'A', title: 'MAESTRO', color: '#39FF14', badge: '🔥' },
  B: { tier: 'B', title: 'BAILARÍN', color: '#00E5FF', badge: '✨' },
  C: { tier: 'C', title: 'EN RITMO', color: '#FFD700', badge: '🎵' },
  D: { tier: 'D', title: 'NOVATO', color: '#8A99AD', badge: '🌱' },
};

export class GamificationEngine {
  private smoothedScore: number = 0;
  private comboStreak: number = 0;
  private sessionHighScore: number = 0;

  /**
   * Determine Rank from current score
   */
  public static getRank(score: number): DancerRank {
    if (score >= 88) return DANCER_RANKS['S+'];
    if (score >= 72) return DANCER_RANKS['S'];
    if (score >= 52) return DANCER_RANKS['A'];
    if (score >= 32) return DANCER_RANKS['B'];
    if (score >= 15) return DANCER_RANKS['C'];
    return DANCER_RANKS['D'];
  }

  /**
   * Calculate live Score based on limb movement velocity & audio energy
   */
  public computeScore(
    movementVelocity: number, // [0..2.5]
    audioEnergy: number,      // [0..1]
    allTimeHighScore: number,
    sessionSeconds: number
  ): GamificationState {
    // Movement magnitude multiplied by dynamic audio volume/energy
    // If user dances vigorously during high energy peaks -> maximum score!
    const effectiveEnergy = Math.max(0.12, audioEnergy);
    const rawScore = Math.min(100, movementVelocity * effectiveEnergy * 95);

    // Exponential smoothing to avoid flickering
    this.smoothedScore = this.smoothedScore * 0.82 + rawScore * 0.18;
    const finalScore = Math.round(Math.max(0, Math.min(100, this.smoothedScore)));

    // Combo streak multiplier: increases when score stays above 50
    if (finalScore >= 50) {
      this.comboStreak = Math.min(3.5, this.comboStreak + 0.02);
    } else {
      this.comboStreak = Math.max(1.0, this.comboStreak - 0.04);
    }

    // High score tracking
    if (finalScore > this.sessionHighScore) {
      this.sessionHighScore = finalScore;
    }

    const rank = GamificationEngine.getRank(finalScore);

    // Calorie calculation: approx 5-8 kcal/min for dancing
    const minutesActive = sessionSeconds / 60;
    const estimatedCalories = Math.max(
      0,
      Math.round((this.sessionHighScore / 100) * minutesActive * 6.5 * 10) / 10
    );

    const isHyperActive = finalScore >= 70;
    const isIdle = finalScore < 30;

    return {
      score: finalScore,
      smoothedScore: this.smoothedScore,
      highScore: this.sessionHighScore,
      allTimeHighScore: Math.max(allTimeHighScore, this.sessionHighScore),
      combo: Math.round(this.comboStreak * 10) / 10,
      rank,
      estimatedCalories,
      isHyperActive,
      isIdle,
    };
  }

  public resetSession() {
    this.smoothedScore = 0;
    this.comboStreak = 1.0;
    this.sessionHighScore = 0;
  }
}
