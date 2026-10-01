import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { projectLandmarkToWorld } from '../services/spatialVisionService';
import { HandGestureStateMachine } from '../spatial/gestures/HandGestureStateMachine';
import { SpatialState } from '../spatial/state/SpatialState';
import type { HandInteractionData } from '../spatial/types';

function makeCamera(z: number, aspect = 16 / 9): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  cam.position.set(0, 0.35, z);
  cam.lookAt(0, 0.35, 0);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

describe('projectLandmarkToWorld', () => {
  it('proyecta el centro del video al eje de la cámara a la distancia pedida', () => {
    const cam = makeCamera(6.2);
    const out = new THREE.Vector3();
    projectLandmarkToWorld({ x: 0.5, y: 0.5, z: 0 }, cam, 2.8, out);
    expect(out.x).toBeCloseTo(0, 3);
    expect(out.y).toBeCloseTo(0.35, 3);
    // Plano de interacción de los instrumentos: Z = 6.2 - 2.8 = 3.4
    expect(out.z).toBeCloseTo(3.4, 3);
  });

  it('aplica modo espejo horizontal: la mano a la izquierda del video va a +X', () => {
    const cam = makeCamera(6.2);
    const left = new THREE.Vector3();
    const right = new THREE.Vector3();
    projectLandmarkToWorld({ x: 0.1, y: 0.5, z: 0 }, cam, 2.8, left);
    projectLandmarkToWorld({ x: 0.9, y: 0.5, z: 0 }, cam, 2.8, right);
    expect(left.x).toBeGreaterThan(0);
    expect(right.x).toBeLessThan(0);
    expect(left.x).toBeCloseTo(-right.x, 3);
  });

  it('el eje Y de la imagen se invierte (arriba en el video = +Y en el mundo)', () => {
    const cam = makeCamera(6.2);
    const top = new THREE.Vector3();
    const bottom = new THREE.Vector3();
    projectLandmarkToWorld({ x: 0.5, y: 0.1, z: 0 }, cam, 2.8, top);
    projectLandmarkToWorld({ x: 0.5, y: 0.9, z: 0 }, cam, 2.8, bottom);
    expect(top.y).toBeGreaterThan(bottom.y);
  });

  it('respeta la posición de la cámara: el plano se desplaza si la cámara se mueve', () => {
    const near = new THREE.Vector3();
    const far = new THREE.Vector3();
    projectLandmarkToWorld({ x: 0.5, y: 0.5, z: 0 }, makeCamera(6.2), 2.8, near);
    projectLandmarkToWorld({ x: 0.5, y: 0.5, z: 0 }, makeCamera(9.0), 2.8, far);
    // Por eso el overlay espacial usa una cámara fija, independiente de los presets
    expect(far.z).toBeCloseTo(6.2, 3);
    expect(near.z).toBeCloseTo(3.4, 3);
  });
});

describe('HandGestureStateMachine — histéresis de pellizco', () => {
  function makeHand(): HandInteractionData {
    const hand = SpatialState.getInstance().rightHand;
    hand.isPresent = true;
    hand.confidenceTier = 'full';
    hand.worldIndexTip.set(0, 0, 0);
    hand.worldVelocity.set(0, 0, 0);
    return hand;
  }

  it('no alterna agarrar/soltar mientras la distancia oscila entre 3 y 5 cm', () => {
    const machine = new HandGestureStateMachine('Right');
    const hand = makeHand();
    const events = { grab: 0, release: 0 };
    const cbs = {
      onGrabConfirmed: () => events.grab++,
      onRelease: () => events.release++,
    };

    let t = 1000;
    // Entrar (< 3.5 cm sostenido) y confirmar el agarre
    hand.pinchDistance = 0.02;
    for (let i = 0; i < 12; i++, t += 16) machine.update(hand, t, cbs);
    expect(machine.getState()).toBe('PINCH_HOLD');
    expect(events.grab).toBe(1);

    // Oscilar dentro de la banda de histéresis (entre 3.5 y 5.8 cm): debe seguir agarrado
    for (let i = 0; i < 60; i++, t += 16) {
      hand.pinchDistance = i % 2 === 0 ? 0.03 : 0.05;
      machine.update(hand, t, cbs);
    }
    expect(machine.getState()).toBe('PINCH_HOLD');
    expect(events.grab).toBe(1);
    expect(events.release).toBe(0);
  });

  it('suelta solo tras superar el umbral de salida durante el tiempo mínimo', () => {
    const machine = new HandGestureStateMachine('Right');
    const hand = makeHand();
    const events = { release: 0 };
    const cbs = { onRelease: () => events.release++ };

    let t = 5000;
    hand.pinchDistance = 0.02;
    for (let i = 0; i < 12; i++, t += 16) machine.update(hand, t, cbs);
    expect(machine.getState()).toBe('PINCH_HOLD');

    // Un solo frame abierto no suelta (parpadeo del tracker)
    hand.pinchDistance = 0.1;
    machine.update(hand, t, cbs);
    t += 16;
    hand.pinchDistance = 0.02;
    machine.update(hand, t, cbs);
    t += 16;
    expect(machine.getState()).toBe('PINCH_HOLD');
    expect(events.release).toBe(0);

    // Abierto sostenido > 60 ms: suelta
    hand.pinchDistance = 0.1;
    for (let i = 0; i < 8; i++, t += 16) machine.update(hand, t, cbs);
    expect(events.release).toBe(1);
  });

  it('vuelve a IDLE si la mano desaparece', () => {
    const machine = new HandGestureStateMachine('Right');
    const hand = makeHand();
    let t = 9000;
    hand.pinchDistance = 0.02;
    for (let i = 0; i < 12; i++, t += 16) machine.update(hand, t);
    hand.isPresent = false;
    machine.update(hand, t);
    expect(machine.getState()).toBe('IDLE');
    expect(hand.pinchState).toBe('IDLE');
  });
});
