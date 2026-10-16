/**
 * An address on the sign-up host (APP_SIGNUP_HOST, e.g. signup.prizy.dev),
 * which the server writes into the page; a workspace host is never it. Stays
 * relative when the page carries none.
 */
export function signupUrl(path: string): string {
    const base = document.querySelector('meta[name="prizy-signup-url"]')?.getAttribute('content') ?? '';
    return `${base}${path}`;
}
