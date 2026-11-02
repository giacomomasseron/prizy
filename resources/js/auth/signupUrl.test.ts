import { afterEach, expect, it } from 'vitest';
import { onSignupHost, signupUrl } from './signupUrl';

afterEach(() => document.head.querySelectorAll('meta[name="prizy-signup-url"]').forEach((m) => m.remove()));

function signupHostIs(url: string) {
    const meta = document.createElement('meta');
    meta.name = 'prizy-signup-url';
    meta.content = url;
    document.head.append(meta);
}

it('prefixes the sign-up host the server wrote into the page', () => {
    signupHostIs('https://signup.prizy.dev');

    expect(signupUrl('/signup')).toBe('https://signup.prizy.dev/signup');
});

it('stays relative when the page carries no sign-up host', () => {
    expect(signupUrl('/signup')).toBe('/signup');
});

it('knows the page is on the sign-up host, by host name as the server does', () => {
    signupHostIs(`https://${window.location.hostname}:8001`);

    expect(onSignupHost()).toBe(true);
});

it('knows a workspace host is not the sign-up host', () => {
    signupHostIs('https://signup.prizy.dev');

    expect(onSignupHost()).toBe(false);
});

it('is not on the sign-up host when the page carries none', () => {
    expect(onSignupHost()).toBe(false);
});
