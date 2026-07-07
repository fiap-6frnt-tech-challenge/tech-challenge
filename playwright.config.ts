import { defineConfig, devices } from '@playwright/test';

const shellUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const dashboardManifestUrl =
  process.env.E2E_DASHBOARD_MFE_URL ?? 'http://localhost:3002/mf-manifest.json';
const transactionsManifestUrl =
  process.env.E2E_TRANSACTIONS_MFE_URL ?? 'http://localhost:3003/mf-manifest.json';
const reuseExistingServer = process.env.E2E_REUSE_SERVERS === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  globalSetup: './e2e/globalSetup.ts',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: shellUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: [
    {
      command: 'node e2e/startShellStandalone.mjs',
      url: shellUrl,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: '/api',
        NEXT_PUBLIC_DASHBOARD_MFE_URL: dashboardManifestUrl,
        NEXT_PUBLIC_TRANSACTIONS_MFE_URL: transactionsManifestUrl,
        AUTH_URL: shellUrl,
        AUTH_SECRET: process.env.AUTH_SECRET ?? 'bytebank-e2e-auth-secret-bytebank-e2e-auth-secret',
        DATABASE_URL:
          process.env.DATABASE_URL ?? 'postgres://bytebank:bytebank@localhost:5432/bytebank',
        BLOB_READ_WRITE_TOKEN: '',
      },
    },
    {
      command: 'npm run preview --workspace @bytebank/dashboard-mfe',
      url: dashboardManifestUrl,
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: 'npm run preview --workspace @bytebank/transactions-mfe',
      url: transactionsManifestUrl,
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
