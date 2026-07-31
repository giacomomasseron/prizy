const W = 72;
const H = 24;
const PAD = 2;

export function Sparkline({ series, color }: { series: (number | null)[]; color: string }) {
    const points = series
        .map((v, i) => (v === null || v === undefined ? null : { i, v }))
        .filter((p): p is { i: number; v: number } => p !== null);
    if (points.length < 2) return null;

    const n = series.length;
    const vs = points.map((p) => p.v);
    const minV = Math.min(...vs);
    const maxV = Math.max(...vs);
    const spanV = maxV - minV;

    const coords = points
        .map((p) => {
            const x = PAD + (n > 1 ? (p.i / (n - 1)) * (W - 2 * PAD) : 0);
            const y = spanV === 0 ? H / 2 : PAD + (1 - (p.v - minV) / spanV) * (H - 2 * PAD);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
            <polyline points={coords} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}
