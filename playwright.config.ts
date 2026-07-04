import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    globalSetup: './tests/e2e/global-setup.ts',
    timeout: 30_000,
    // Serial execution: all specs share one reseeded DB + one smoke user.
    // Parallel workers cause session races (login timing) and cross-spec state
    // pollution (e.g. entities.spec creates a 2nd team, breaking auto-select
    // in create-issue drawer for later specs).
    workers: 1,
    use: {
        baseURL: 'http://smoke.localhost:8001',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
