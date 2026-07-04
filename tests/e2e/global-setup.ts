import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

/**
 * Playwright global setup: fresh-migrate + seed the smoke workspace, then log
 * in once and save storageState so all specs start pre-authenticated.
 * This keeps POST /login calls to ≤1 per run, well under the prod throttle (10/min).
 */
export default async function globalSetup() {
    console.log('[global-setup] migrate:fresh + SmokeSeeder …');
    execSync(
        'docker compose exec -T app php artisan migrate:fresh --drop-types --force',
        { stdio: 'inherit', cwd: process.cwd() },
    );
    execSync(
        'docker compose exec -T app php artisan db:seed --class="Database\\\\Seeders\\\\SmokeSeeder"',
        { stdio: 'inherit', cwd: process.cwd() },
    );
    console.log('[global-setup] seeding done — capturing storageState …');

    const authDir = path.join(process.cwd(), 'tests/e2e/.auth');
    fs.mkdirSync(authDir, { recursive: true });

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://smoke.localhost:8001/login');
    await page.getByLabel(/email/i).fill('smoke@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('http://smoke.localhost:8001/');

    await context.storageState({ path: path.join(authDir, 'smoke.json') });
    await browser.close();

    console.log('[global-setup] storageState saved — done.');
}
