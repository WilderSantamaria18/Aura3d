import { test, expect } from '@playwright/test';

const BREAKPOINTS = [
  { name: 'Mobile_360px', width: 360, height: 640 },
  { name: 'Tablet_768px', width: 768, height: 1024 },
  { name: 'Desktop_1024px', width: 1024, height: 768 },
  { name: 'DesktopWide_1440px', width: 1440, height: 900 },
];

test.describe('Aura3D Visual Regression Test Suite', () => {
  for (const bp of BREAKPOINTS) {
    test(`Landing and Studio Layout at ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');

      // Wait for font and styles hydration
      await page.waitForLoadState('networkidle');

      // 1. Snapshot Landing View
      await expect(page).toHaveScreenshot(`landing-${bp.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    });

    test(`Equalizer Modal Visual Test at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');

      // Press 'E' to open Equalizer
      await page.keyboard.press('KeyE');
      await page.waitForSelector('[role="dialog"][aria-labelledby="eq-dialog-title"]', {
        state: 'visible',
      });

      await expect(page).toHaveScreenshot(`equalizer-${bp.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    });

    test(`Command Palette Visual Test at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');

      // Press Ctrl+K
      await page.keyboard.press('Control+KeyK');
      await page.waitForSelector('[role="combobox"]', { state: 'visible' });

      await expect(page).toHaveScreenshot(`command-palette-${bp.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    });
  }
});
