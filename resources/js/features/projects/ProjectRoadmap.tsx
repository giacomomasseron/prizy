import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMilestones } from './hooks';
import { milestoneState, fmtDate } from './projectDetail';
import { MS_TAG, MS_ICON } from './milestoneMeta';
import { QueryState } from '../../components/ui/QueryState';
import { StatusIcon } from '../../components/ui/StatusIcon';
import { chipClasses, chipStyle } from '../issues/issueStyles';
import { emptyState, filterLabel, pageCount, pageTitle, tagPill, titleRow } from './projectStyles';
import { ink } from '../../lib/ink';

type MsState = 'all' | 'done' | 'active' | 'upcoming';
const CHIPS: Array<[MsState, string]> = [['all', 'All'], ['done', 'Done'], ['active', 'In progress'], ['upcoming', 'Upcoming']];

export default function ProjectRoadmap() {
    const { id = '' } = useParams();
    const milestones = useMilestones(id);
    const [state, setState] = useState<MsState>('all');

    const items = (milestones.data?.items ?? []).map((m) => ({ m, st: milestoneState(m.target_date, new Date()) }));
    const shown = state === 'all' ? items : items.filter((x) => x.st === state);

    return (
        <>
            <div style={titleRow}>
                <h1 style={pageTitle}><span className="hl">Roadmap</span></h1>
                <span data-testid="roadmap-count" style={pageCount}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                <span style={filterLabel}>State</span>
                {CHIPS.map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setState(k)} aria-pressed={state === k} className={chipClasses(state === k)} style={chipStyle}>{label}</button>
                ))}
            </div>

            <QueryState query={milestones} what="milestones">
                {shown.length > 0 ? (
                    <div style={{ position: 'relative', paddingLeft: 8 }}>
                        <div data-testid="roadmap-spine" aria-hidden="true" style={{ position: 'absolute', left: 19, top: 20, bottom: 20, borderLeft: '2px dashed var(--border2)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {shown.map(({ m, st }) => {
                                const tag = MS_TAG[st];
                                return (
                                    <div key={m.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <StatusIcon status={MS_ICON[st]} size={20} />
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, border: 'var(--line) solid var(--border)', borderRadius: 'var(--radius-card)', padding: '14px 20px', background: 'var(--panel)' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--fg)' }}>{m.name}</div>
                                                <div style={{ fontSize: 12.5, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>{fmtDate(m.target_date)}</div>
                                            </div>
                                            <span data-testid="roadmap-tag" style={{ ...tagPill, color: ink(tag.color), background: tag.bg }}>{tag.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div style={emptyState}>No milestones in this state.</div>
                )}
            </QueryState>
        </>
    );
}
