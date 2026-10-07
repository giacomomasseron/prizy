import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRoadmap } from './hooks';
import { barGeometry, computeWindow, isScheduled, markerLeft } from './layout';
import { PageHeader } from '../../components/PageHeader';
import { sectionTitle } from '../issues/issueStyles';
import { cardStyle, emptyState } from '../projects/projectStyles';

export default function RoadmapPage() {
    const roadmap = useRoadmap();
    const projects = useMemo(() => roadmap.data ?? [], [roadmap.data]);
    const win = useMemo(() => computeWindow(projects, new Date()), [projects]);
    if (roadmap.isLoading) return <p style={{ margin: 0, padding: '24px 26px 24px calc(26px + var(--nav-inset, 0px))', fontSize: 15, color: 'var(--fg3)' }}>Loading…</p>;
    const scheduled = projects.filter(isScheduled);
    const unscheduled = projects.filter((p) => !isScheduled(p));
    const period = win.months.length ? `${win.months[0].label}–${win.months[win.months.length - 1].label} ${win.end.getFullYear()}` : '';

    return (
        <>
            <PageHeader title="Roadmap">
                {period && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg3)' }}>{period}</span>}
            </PageHeader>

            <div style={{ padding: '4px 26px 40px' }}>
                {projects.length === 0 && <div style={emptyState}>No projects yet.</div>}

                {scheduled.length > 0 && (
                    <div style={{ ...cardStyle, borderRadius: 18, overflow: 'hidden' }}>
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
                                <div key={p.id} className="border-b border-border last:border-b-0" style={{ display: 'flex', alignItems: 'center', height: 64, paddingLeft: 20 }}>
                                    <div style={{ width: 210, flexShrink: 0, paddingRight: 16, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                        <Link to={`/projects/${p.id}`} className="text-fg hover:text-accent" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Link>
                                    </div>
                                    <div style={{ flex: 1, position: 'relative', height: '100%', backgroundImage: grid }}>
                                        {/* White label on the project colour (spec §4.4). */}
                                        <div data-testid={`bar-${p.id}`}
                                            style={{ position: 'absolute', left: `${g.leftPct}%`, width: `${g.widthPct}%`, top: '50%', transform: 'translateY(-50%)', height: 32, borderRadius: 'var(--radius-pill)', background: p.color, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, color: '#fff', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden' }}
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
                    <div style={{ marginTop: 28 }}>
                        <h2 style={{ ...sectionTitle(17), marginBottom: 12 }}>Unscheduled</h2>
                        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                            {unscheduled.map((p) => (
                                <li key={p.id}>
                                    <Link
                                        to={`/projects/${p.id}`}
                                        className="border-border text-fg hover:border-fg"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 13px', borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--panel)', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
                                    >
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                        {p.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
}
