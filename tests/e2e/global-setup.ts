import { execSync } from 'node:child_process';

/**
 * Playwright global setup: fresh-migrate + seed the smoke workspace before
 * every full test run so each spec starts from a known database state.
 */
export default function globalSetup() {
    console.log('[global-setup] migrate:fresh + SmokeSeeder …');
    execSync(
        'docker compose exec -T app php artisan migrate:fresh --drop-types --force',
        { stdio: 'inherit', cwd: process.cwd() },
    );
    execSync(
        'docker compose exec -T app php artisan db:seed --class="Database\\\\Seeders\\\\SmokeSeeder"',
        { stdio: 'inherit', cwd: process.cwd() },
    );
    console.log('[global-setup] done.');
}
