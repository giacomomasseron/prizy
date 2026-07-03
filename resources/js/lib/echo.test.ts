import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEcho } from './echo';

describe('getEcho', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('returns null when VITE_REVERB_APP_KEY is unset (graceful no-op)', () => {
        vi.stubEnv('VITE_REVERB_APP_KEY', '');
        expect(getEcho()).toBeNull();
    });
});
