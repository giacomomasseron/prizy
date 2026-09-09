/**
 * Formats a date-only string (`YYYY-MM-DD`, e.g. `target_date`) as a calendar
 * day, independent of the viewer's timezone.
 *
 * `new Date(iso)` on a date-only string parses it as UTC midnight, which
 * renders as the PREVIOUS calendar day for any viewer west of UTC (see
 * `fmtDate` in `features/projects/ProjectsPage.tsx` for the same fix). We
 * split the y/m/d components and use the local-components `Date` constructor
 * instead, so the same calendar day is shown everywhere.
 */
export function formatTargetDate(iso: string | null): string {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
