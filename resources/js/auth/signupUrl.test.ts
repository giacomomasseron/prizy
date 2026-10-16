import { afterEach, expect, it } from 'vitest';
import { signupUrl } from './signupUrl';

afterEach(() => document.head.querySelectorAll('meta[name="prizy-signup-url"]').forEach((m) => m.remove()));

it('prefixes the sign-up host the server wrote into the page', () => {
    const meta = document.createElement('meta');
    meta.name = 'prizy-signup-url';
    meta.content = 'https://signup.prizy.dev';
    document.head.append(meta);

    expect(signupUrl('/signup')).toBe('https://signup.prizy.dev/signup');
});

it('stays relative when the page carries no sign-up host', () => {
    expect(signupUrl('/signup')).toBe('/signup');
});
