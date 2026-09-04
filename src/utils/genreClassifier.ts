/**
 * Clasificador ligero de género musical en tiempo real (DSP / ML Heurístico)
 * Analiza el balance espectral entre bandas (Bajos, Medios, Agudos)
 */
export const classifyGenre = (fftData: Uint8Array): string => {
  if (!fftData || fftData.length === 0) return 'Ambiente / Chill';

  const bassSlice = fftData.slice(0, Math.min(10, fftData.length));
  const midsSlice = fftData.slice(10, Math.min(20, fftData.length));
  const trebleSlice = fftData.slice(20, Math.min(32, fftData.length));

  const bass = bassSlice.length > 0 ? bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length : 0;
  const mids = midsSlice.length > 0 ? midsSlice.reduce((a, b) => a + b, 0) / midsSlice.length : 0;
  const treble = trebleSlice.length > 0 ? trebleSlice.reduce((a, b) => a + b, 0) / trebleSlice.length : 0;

  const total = bass + mids + treble + 1;
  const bassRatio = bass / total;
  const trebleRatio = treble / total;

  if (bassRatio > 0.55 && bass > 60) return 'Electrónica / Hip-Hop';
  if (trebleRatio > 0.45 && treble > 50) return 'Clásica / Pop';
  if (mids > 140 && bassRatio > 0.35) return 'Rock / Metal';
  if (bass > 100 && mids > 90) return 'Reggaeton / Urbano';
  if (bass < 30 && mids < 30 && treble < 30) return 'Ambient / Chill';

  return 'Pop / Indie';
};

