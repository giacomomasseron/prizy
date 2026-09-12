export function slugify(s: string): string {
    return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function formatViews(n: number): string { return n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n); }
export function shortRef(id: string): string { return id.slice(0, 6).toUpperCase(); }
export function wordStats(md: string): { words: number; minutes: number } {
    const words = md.trim() ? md.trim().split(/\s+/).length : 0;
    return { words, minutes: words ? Math.max(1, Math.round(words / 200)) : 0 };
}
export function relativeTime(iso: string | null): string {
    if (!iso) return '—';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    if (s < 86400 * 14) return `${Math.round(s / 86400)}d ago`;
    if (s < 86400 * 60) return `${Math.round(s / (86400 * 7))}w ago`;
    return `${Math.round(s / (86400 * 30))}mo ago`;
}
export function formatDate(iso: string | null): string {
    return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
