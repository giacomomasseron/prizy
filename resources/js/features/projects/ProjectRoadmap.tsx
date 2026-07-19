import { useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { useMilestones } from './hooks';
import { milestoneState, fmtDate } from './projectDetail';
import { MS_TAG, MS_ICON } from './milestoneMeta';
import { StatusIcon } from '../../components/ui/StatusIcon';

type MsState = 'all' | 'done' | 'active' | 'upcoming';
const CHIPS: Array<[MsState, string]> = [['all', 'All'], ['done', 'Done'], ['active', 'In progress'], ['upcoming', 'Upcoming']];

function chipCss(active: boolean): CSSProperties {
    return { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 7, border: '1px solid', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent2)' : 'transparent', color: active ? 'var(--fg)' : 'var(--fg2)' };
}

export default function ProjectRoadmap() {
    const { id = '' } = useParams();
    const milestones = useMilestones(id);
    const [state, setState] = useState<MsState>('all');

    const items = (milestones.data?.items ?? []).map((m) => ({ m, st: milestoneState(m.target_date, new Date()) }));
    const shown = state === 'all' ? items : items.filter((x) => x.st === state);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-.02em' }}>Roadmap</h1>
                <span data-testid="roadmap-count" style={{ fontSize: 12.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, color: 'var(--fg3)', width: 60, flexShrink: 0 }}>State</span>
                {CHIPS.map(([k, label]) => <button key={k} type="button" onClick={() => setState(k)} style={chipCss(state === k)}>{label}</button>)}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: '6px 22px', background: 'var(--panel)', marginTop: 12 }}>
                {shown.map(({ m, st }) => {
                    const tag = MS_TAG[st];
                    return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                            <StatusIcon status={MS_ICON[st]} size={18} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, color: 'var(--fg)', fontWeight: 500 }}>{m.name}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{fmtDate(m.target_date)}</div>
                            </div>
                            <span data-testid="roadmap-tag" style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap', color: tag.color, background: tag.bg }}>{tag.label}</span>
                        </div>
                    );
                })}
                {shown.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>No milestones in this state.</div>}
            </div>
        </>
    );
}
