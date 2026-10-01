import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * `usePlayerStore()` sin selector suscribe el componente a TODO el store: se re-renderiza en cada
 * cambio de currentTime (cada 250 ms), bpm, isBeatPulse, etc. Hay que pasar un selector
 * (`usePlayerStore((s) => s.x)` o `usePlayerStore(useShallow(...))`), o leer con `.getState()`.
 */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === 'node_modules') continue;
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Quita comentarios para que un texto que mencione la llamada no cuente como uso */
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('suscripciones al store del reproductor', () => {
  it('ningún componente ni hook se suscribe al store entero', () => {
    const root = path.resolve(__dirname, '..');
    const offenders = sourceFiles(root)
      .filter((file) => /usePlayerStore\(\s*\)/.test(stripComments(fs.readFileSync(file, 'utf8'))))
      .map((file) => path.relative(root, file));

    expect(offenders).toEqual([]);
  });
});
