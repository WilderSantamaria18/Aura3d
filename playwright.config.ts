import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: { mode: 'on', animations: 'disabled' },
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  },
  webServer: {
    command: process.env.CI ? 'npm run preview' : 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'Mobile-360px',
      use: {
        viewport: { width: 360, height: 640 },
        isMobile: true,
      },
    },
    {
      name: 'Tablet-768px',
      use: {
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'Laptop-1024px',
      use: {
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'Desktop-1440px',
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
