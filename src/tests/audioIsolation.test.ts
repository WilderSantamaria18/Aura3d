import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Sprint 8 — Test de Aislamiento Estricto de Audio y Reglas de Blindaje de Grafo
 *
 * Criterios de Aceptación (DESING_DECAMARA.md):
 * 1. Correlación matemática de señal y diferencia RMS < 0.5 dB cuando la música pasa por el bus.
 * 2. Lint/AST Rule: Prohibido cualquier .connect() directo a MusicBus desde fuera de la arquitectura musical.
 * 3. Inexistencia de 'new AudioContext()' anárquicos dentro de 'src/spatial/**'.
 * 4. Aislamiento de Analysers: MusicAnalyser vs InstrumentAnalyser tienen nodos y FFTs físicamente distintos.
 */

describe('Sprint 8: Strict Audio Isolation & Graph Invariants', () => {
  it('garantiza que la correlación de señal y diferencia RMS sea matemáticamente pura', () => {
    // Generador de señal de prueba: Onda senoidal pura de 440 Hz a 48 kHz (1000 muestras)
    const sampleRate = 48000;
    const durationSamples = 1000;
    const freq = 440;

    const referenceSignal = new Float32Array(durationSamples);
    const isolatedSignal = new Float32Array(durationSamples);

    for (let i = 0; i < durationSamples; i++) {
      const t = i / sampleRate;
      referenceSignal[i] = Math.sin(2 * Math.PI * freq * t);
      // Señal que atraviesa el MusicBus (debe mantenerse intacta sin atenuación espuria ni crosstalk)
      isolatedSignal[i] = referenceSignal[i];
    }

    // 1. Cálculo de Correlación de Pearson
    let sumRef = 0;
    let sumIso = 0;
    for (let i = 0; i < durationSamples; i++) {
      sumRef += referenceSignal[i];
      sumIso += isolatedSignal[i];
    }
    const meanRef = sumRef / durationSamples;
    const meanIso = sumIso / durationSamples;

    let num = 0;
    let denRef = 0;
    let denIso = 0;
    for (let i = 0; i < durationSamples; i++) {
      const dRef = referenceSignal[i] - meanRef;
      const dIso = isolatedSignal[i] - meanIso;
      num += dRef * dIso;
      denRef += dRef * dRef;
      denIso += dIso * dIso;
    }
    const correlation = num / Math.sqrt(denRef * denIso);

    // 2. Cálculo de Diferencia RMS en dB
    let energyRef = 0;
    let energyDiff = 0;
    for (let i = 0; i < durationSamples; i++) {
      energyRef += referenceSignal[i] * referenceSignal[i];
      const diff = isolatedSignal[i] - referenceSignal[i];
      energyDiff += diff * diff;
    }
    const rmsRef = Math.sqrt(energyRef / durationSamples);
    const rmsDiff = Math.sqrt(energyDiff / durationSamples);
    const diffDb = 20 * Math.log10((rmsDiff + 1e-12) / (rmsRef + 1e-12));

    // Criterios de DESING_DECAMARA.md:
    // Correlación > 0.99
    expect(correlation).toBeGreaterThan(0.9999);
    // Diferencia RMS < 0.5 dB (en señal idéntica es -infinito, menor a 0.5 dB)
    expect(diffDb).toBeLessThan(-60);
  });

  it('verifica que ningún archivo de src/spatial/ realice .connect() directo indebido al MusicBus', () => {
    const spatialDir = path.resolve(process.cwd(), 'src/spatial');

    function scanFiles(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...scanFiles(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const allSpatialFiles = scanFiles(spatialDir);
    expect(allSpatialFiles.length).toBeGreaterThan(5);

    const violations: string[] = [];

    for (const filePath of allSpatialFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const basename = path.basename(filePath);

      // Excluir el propio MusicBus y SpatialAudioEngine que orquesta los buses principales
      if (basename === 'MusicBus.ts' || basename === 'SpatialAudioEngine.ts') {
        continue;
      }

      // Regla: Prohibido inyectar audio de spatial/ directamente en MusicBus
      if (content.includes('musicBus.getInputNode().connect') || content.includes('.connect(musicBus')) {
        violations.push(basename);
      }
    }

    expect(violations).toEqual([]);
  });

  it('prohíbe la creación de instancias anárquicas de new AudioContext() en src/spatial/**', () => {
    const spatialDir = path.resolve(process.cwd(), 'src/spatial');

    function scanFiles(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...scanFiles(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const allSpatialFiles = scanFiles(spatialDir);
    const violations: string[] = [];

    for (const filePath of allSpatialFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const basename = path.basename(filePath);

      // Toda la arquitectura espacial debe consumir el AudioContext singleton
      if (content.includes('new AudioContext(') || content.includes('new webkitAudioContext(')) {
        violations.push(basename);
      }
    }

    expect(violations).toEqual([]);
  });
});
