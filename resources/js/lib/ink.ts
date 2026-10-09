/**
 * The text colour for a status colour (V2-G3a). Status tokens are tuned for fills (dots, bars, tints); as small text
 * in light mode they fall under 4.5:1, so text uses each token's darker "-ink" partner (app.css). `--fg3` maps to
 * `--fg2` (fg3 on its own tint is 4.0:1). Anything else — a user colour, a token without a partner — is returned as is.
 */
const INK: Record<string, string> = {
    'var(--red)': 'var(--red-ink)',
    'var(--amber)': 'var(--amber-ink)',
    'var(--green)': 'var(--green-ink)',
    'var(--blue)': 'var(--blue-ink)',
    'var(--teal)': 'var(--teal-ink)',
    'var(--sup)': 'var(--sup-ink)',
    'var(--note)': 'var(--note-ink)',
    'var(--accent)': 'var(--accent-ink)',
    'var(--fg3)': 'var(--fg2)',
};

export function ink(color: string): string {
    return INK[color] ?? color;
}
