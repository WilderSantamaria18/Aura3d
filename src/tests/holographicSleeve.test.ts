import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as unknown as { Audio: unknown }).Audio = function () {
    return new Proxy({}, { get: () => () => undefined, set: () => true });
  };
});

import {
  computeTiltCoordinates,
  computeSleeveRotations,
  advanceVinylAngle,
} from '../components/Player/HolographicAlbumSleeve';

describe('HolographicAlbumSleeve 3D Physics & Vinyl Mechanics', () => {
  it('computes normalized tilt coordinates from element bounds', () => {
    const rect = { left: 100, top: 100, width: 200, height: 200 };

    // Exact center
    const center = computeTiltCoordinates(200, 200, rect);
    expect(center.x).toBeCloseTo(0, 3);
    expect(center.y).toBeCloseTo(0, 3);

    // Top-left corner
    const topLeft = computeTiltCoordinates(100, 100, rect);
    expect(topLeft.x).toBeCloseTo(-1, 3);
    expect(topLeft.y).toBeCloseTo(-1, 3);

    // Bottom-right corner
    const bottomRight = computeTiltCoordinates(300, 300, rect);
    expect(bottomRight.x).toBeCloseTo(1, 3);
    expect(bottomRight.y).toBeCloseTo(1, 3);

    // Clamps out-of-bounds values
    const outOfBounds = computeTiltCoordinates(500, -100, rect);
    expect(outOfBounds.x).toBe(1);
    expect(outOfBounds.y).toBe(-1);
  });

  it('computes 3D sleeve rotation and dynamic specular sheen angle', () => {
    const tilt = { x: 0.5, y: -0.5 };
    const { rotX, rotY, shadowX, shadowY, sheenAngle } = computeSleeveRotations(tilt);

    // When tilting up (y < 0), sleeve tilts backward (rotX > 0)
    expect(rotX).toBe(7);
    // When tilting right (x > 0), rotY is positive
    expect(rotY).toBe(7);
    // Shadow offsets in opposite direction
    expect(shadowX).toBe(-8);
    expect(shadowY).toBe(26);
    // Sheen angle shifts dynamically
    expect(sheenAngle).toBe(120 + 0.5 * 35 + -0.5 * 20);
  });

  it('advances vinyl rotation angle continuously with correct RPM speed', () => {
    // 33.3 RPM = 33.3 * 360 / 60 = ~199.8 deg/sec
    const startAngle = 0;
    const deltaMs = 1000;
    const nextAngle = advanceVinylAngle(startAngle, deltaMs, 33.3);

    expect(nextAngle).toBeCloseTo(199.8, 1);

    // Wraps around 360 degrees
    const wrappedAngle = advanceVinylAngle(350, 100, 33.3);
    expect(wrappedAngle).toBeLessThan(360);
    expect(wrappedAngle).toBeCloseTo((350 + 19.98) % 360, 1);
  });
});
