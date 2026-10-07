import { describe, it, expect } from 'vitest';
import { PlayerGestureDetector, type HandSample, type PlayerGestureAction } from '../features/gestures/playerGestures';

/** Reproduce una trayectoria a 30 fps y devuelve las acciones emitidas. */
function run(
  det: PlayerGestureDetector,
  from: HandSample,
  to: HandSample,
  ms: number,
  startAt = 0,
  fps = 30
): { actions: PlayerGestureAction[]; end: number; lastProgress: number } {
  const steps = Math.max(1, Math.round((ms / 1000) * fps));
  const actions: PlayerGestureAction[] = [];
  let lastProgress = 0;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const frame = det.update(
      { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, pose: to.pose },
      startAt + (ms * i) / steps
    );
    if (frame.action) actions.push(frame.action);
    lastProgress = frame.palmProgress;
  }
  return { actions, end: startAt + ms, lastProgress };
}

const open = (x: number, y: number): HandSample => ({ x, y, pose: 'open' });
const pinch = (x: number, y: number): HandSample => ({ x, y, pose: 'pinch' });

describe('PlayerGestureDetector', () => {
  it('swipe a la derecha pasa a la pista siguiente', () => {
    const { actions } = run(new PlayerGestureDetector(), open(0.3, 0.5), open(0.7, 0.5), 250);
    expect(actions).toEqual([{ type: 'next' }]);
  });

  it('swipe a la izquierda vuelve a la pista anterior', () => {
    const { actions } = run(new PlayerGestureDetector(), open(0.7, 0.5), open(0.3, 0.5), 250);
    expect(actions).toEqual([{ type: 'previous' }]);
  });

  it('un movimiento lento no cuenta como swipe', () => {
    const { actions } = run(new PlayerGestureDetector(), open(0.3, 0.5), open(0.7, 0.5), 2000);
    expect(actions.filter((a) => a.type !== 'toggle')).toEqual([]);
  });

  it('un movimiento sobre todo vertical no cuenta como swipe', () => {
    const { actions } = run(new PlayerGestureDetector(), open(0.45, 0.2), open(0.6, 0.8), 250);
    expect(actions).toEqual([]);
  });

  it('el cooldown evita dos swipes seguidos', () => {
    const det = new PlayerGestureDetector();
    const a = run(det, open(0.3, 0.5), open(0.7, 0.5), 250);
    const b = run(det, open(0.3, 0.5), open(0.7, 0.5), 250, a.end + 100);
    expect(a.actions).toHaveLength(1);
    expect(b.actions).toHaveLength(0);
  });

  it('pellizco hacia arriba sube el volumen y hacia abajo lo baja', () => {
    const up = run(new PlayerGestureDetector(), pinch(0.5, 0.7), pinch(0.5, 0.3), 500).actions;
    const down = run(new PlayerGestureDetector(), pinch(0.5, 0.3), pinch(0.5, 0.7), 500).actions;
    const sum = (list: PlayerGestureAction[]) =>
      list.reduce((acc, a) => acc + (a.type === 'volume' ? a.delta : 0), 0);
    expect(sum(up)).toBeGreaterThan(0.4);
    expect(sum(down)).toBeLessThan(-0.4);
  });

  it('el temblor del pellizco no cambia el volumen', () => {
    const det = new PlayerGestureDetector();
    const actions: PlayerGestureAction[] = [];
    for (let i = 0; i < 30; i++) {
      const f = det.update(pinch(0.5, 0.5 + (i % 2 ? 0.001 : -0.001)), i * 33);
      if (f.action) actions.push(f.action);
    }
    expect(actions).toEqual([]);
  });

  it('palma fija durante ~0,9 s alterna play/pausa y muestra progreso', () => {
    const det = new PlayerGestureDetector();
    const mid = run(det, open(0.5, 0.5), open(0.5, 0.5), 500);
    expect(mid.lastProgress).toBeGreaterThan(0.3);
    expect(mid.lastProgress).toBeLessThan(1);
    const rest = run(det, open(0.5, 0.5), open(0.5, 0.5), 700, mid.end);
    expect([...mid.actions, ...rest.actions]).toEqual([{ type: 'toggle' }]);
  });

  it('mantener la palma no vuelve a disparar hasta cerrar la mano', () => {
    const det = new PlayerGestureDetector();
    const first = run(det, open(0.5, 0.5), open(0.5, 0.5), 1200);
    const hold = run(det, open(0.5, 0.5), open(0.5, 0.5), 4000, first.end);
    expect(first.actions).toHaveLength(1);
    expect(hold.actions).toHaveLength(0);
    const fist = run(det, { x: 0.5, y: 0.5, pose: 'fist' }, { x: 0.5, y: 0.5, pose: 'fist' }, 200, first.end + 4000);
    const again = run(det, open(0.5, 0.5), open(0.5, 0.5), 3000, fist.end);
    expect(again.actions).toHaveLength(1);
  });

  it('perder la mano reinicia el progreso', () => {
    const det = new PlayerGestureDetector();
    run(det, open(0.5, 0.5), open(0.5, 0.5), 600);
    expect(det.update(null, 700)).toEqual({ action: null, palmProgress: 0 });
    const again = run(det, open(0.5, 0.5), open(0.5, 0.5), 300, 800);
    expect(again.actions).toEqual([]);
  });
});
