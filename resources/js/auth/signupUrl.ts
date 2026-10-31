/**
 * An address on the sign-up host (APP_SIGNUP_HOST, e.g. signup.prizy.dev),
 * which the server writes into the page; a workspace host is never it. Stays
 * relative when the page carries none.
 */
export function signupUrl(path: string): string {
    return `${signupOrigin()}${path}`;
}

/** Is this page on the sign-up host? By host name, as the server decides it. */
export function onSignupHost(): boolean {
    const origin = signupOrigin();
    return origin !== '' && new URL(origin).hostname === window.location.hostname;
}

function signupOrigin(): string {
    return document.querySelector('meta[name="prizy-signup-url"]')?.getAttribute('content') ?? '';
}
