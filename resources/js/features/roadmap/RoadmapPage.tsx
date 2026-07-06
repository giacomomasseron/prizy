import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRoadmap } from './hooks';
import { barGeometry, computeWindow, isScheduled, markerLeft } from './layout';

export default function RoadmapPage() {
    const roadmap = useRoadmap();
    const projects = useMemo(() => roadmap.data ?? [], [roadmap.data]);
    const win = useMemo(() => computeWindow(projects, new Date()), [projects]);
    if (roadmap.isLoading) return <p style={{ padding: 24 }}>Loading…</p>;
    const scheduled = projects.filter(isScheduled);
    const unscheduled = projects.filter((p) => !isScheduled(p));
    const period = win.months.length ? `${win.months[0].label}–${win.months[win.months.length - 1].label} ${win.end.getFullYear()}` : '';

    return (
        <div style={{ padding: '24px 30px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h1 style={{ fontSize: 16, fontWeight: 600 }}>Roadmap</h1>
                <span style={{ fontSize: 12, color: 'var(--fg3)' }}>{period}</span>
            </div>
            {projects.length === 0 && <p style={{ color: 'var(--fg2)' }}>No projects yet.</p>}

            {scheduled.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
                    <div style={{ display: 'flex', padding: '10px 0 10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                        <div style={{ width: 210, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex' }}>
                            {win.months.map((m) => (
                                <div key={m.key} style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg3)', paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>{m.label}</div>
                            ))}
                        </div>
                    </div>
                    {scheduled.map((p) => {
                        const g = barGeometry(win, p.start_date, p.target_date);
                        const grid = `repeating-linear-gradient(90deg,var(--border) 0 1px,transparent 1px calc(100%/${win.months.length}))`;
                        return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', height: 64, borderBottom: '1px solid var(--border)', paddingLeft: 20 }}>
                                <div style={{ width: 210, flexShrink: 0, paddingRight: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 4, background: p.color, flexShrink: 0 }} />
                                    <Link to={`/projects/${p.id}`} style={{ color: 'var(--fg)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Link>
                                </div>
                                <div style={{ flex: 1, position: 'relative', height: '100%', backgroundImage: grid }}>
                                    <div data-testid={`bar-${p.id}`}
                                        style={{ position: 'absolute', left: `${g.leftPct}%`, width: `${g.widthPct}%`, top: '50%', transform: 'translateY(-50%)', height: 32, borderRadius: 9, background: p.color, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }}
                                        title={`${p.name} · ${p.start_date} → ${p.target_date} · ${p.status}`}>
                                        {p.name}<span style={{ opacity: .82, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500 }}>{p.progress ?? 0}%</span>
                                    </div>
                                    {p.milestones.map((m) => (
                                        <span key={m.id} data-testid={`ms-${m.id}`} style={{ position: 'absolute', top: 0, transform: 'translateX(-50%)', fontSize: 12, color: 'var(--accent)', left: `${markerLeft(win, m.target_date)}%` }} title={`${m.name} · ${m.target_date}`}>◆</span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {unscheduled.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg2)', marginBottom: 6 }}>Unscheduled</h2>
                    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, listStyle: 'none', padding: 0 }}>
                        {unscheduled.map((p) => <li key={p.id}><Link to={`/projects/${p.id}`} style={{ color: 'var(--accent)' }}>{p.name}</Link></li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}
