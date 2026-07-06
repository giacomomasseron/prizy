import { useState, type CSSProperties } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import { LabelChip } from '../../components/ui/LabelChip';
import type { Label } from '../../lib/types';
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from './hooks';
import { groupLabels, labelStats } from './labelGroups';

const SWATCHES = ['#eb5757', '#e0894a', '#d0a23a', '#3a9a68', '#3aa8a0', '#5b8def'];

const card: CSSProperties = { border: '1px solid var(--border)', borderRadius: 11, padding: '13px 15px' };
const statLabel: CSSProperties = { fontSize: 10.5, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--fg3)' };
const statValue: CSSProperties = { fontSize: 22, fontWeight: 600, marginTop: 4 };
const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };

export default function LabelsSettingsPage() {
    const me = useMe();
    const canDevelop = !!me.data?.is_developer && me.data?.admin_level !== 'viewer';
    const labelsQ = useLabels();
    const create = useCreateLabel();
    const update = useUpdateLabel();
    const del = useDeleteLabel();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#5b8def');
    const [group, setGroup] = useState('');
    const [error, setError] = useState('');

    const labels = labelsQ.data?.items ?? [];
    const stats = labelStats(labels);
    const grouped = groupLabels(labels);
    const existingGroups = [...new Set(labels.map((l) => l.group).filter((g): g is string => !!g))];

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim()) return;
        try {
            await create.mutateAsync({ name: name.trim(), color, group: group.trim() || null });
            setName(''); setColor('#5b8def'); setGroup(''); setOpen(false);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : 'Failed to create label.');
        }
    }

    function recolor(l: Label, hex: string) {
        setError('');
        update.mutateAsync({ id: l.id, color: hex }).catch((err) =>
            setError(err instanceof ApiError ? err.detail : 'Failed to update label.'));
    }

    function remove(l: Label) {
        setError('');
        if (!window.confirm(`Delete label ${l.name}?`)) return;
        del.mutateAsync(l.id).catch((err) =>
            setError(err instanceof ApiError ? err.detail : 'Failed to delete label.'));
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 30px 80px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: '-.02em' }}>Labels</h1>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg2)', maxWidth: 600 }}>
                        Labels categorize issues across the workspace. Grouped labels are mutually exclusive within their group.
                    </p>
                </div>
                {canDevelop && (
                    <button type="button" onClick={() => { setError(''); setOpen((o) => !o); }}
                        style={{ marginLeft: 'auto', border: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                        New label
                    </button>
                )}
            </div>

            {canDevelop && open && (
                <form onSubmit={submit} style={{ border: '1px solid var(--border2)', borderRadius: 13, background: 'var(--panel)', padding: 16, margin: '20px 0 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label name" aria-label="Label name" maxLength={64}
                            style={{ flex: 1, border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: 9, padding: '9px 12px', color: 'var(--fg)', fontSize: 13.5, outline: 'none' }} />
                        <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group (optional)" aria-label="Label group" list="label-groups" maxLength={64}
                            style={{ width: 180, border: '1px solid var(--border)', background: 'var(--bg2)', borderRadius: 9, padding: '9px 12px', color: 'var(--fg)', fontSize: 13.5, outline: 'none' }} />
                        <datalist id="label-groups">{existingGroups.map((g) => <option key={g} value={g} />)}</datalist>
                        <button type="submit" disabled={create.isPending}
                            style={{ border: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: create.isPending ? 0.5 : 1 }}>
                            Add label
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--fg3)', width: 44 }}>Color</span>
                        {SWATCHES.map((hex) => (
                            <button key={hex} type="button" aria-label={`color ${hex}`} onClick={() => setColor(hex)}
                                style={{ width: 20, height: 20, borderRadius: 6, cursor: 'pointer', border: 'none', background: hex, boxShadow: color === hex ? '0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg2)' : 'none' }} />
                        ))}
                    </div>
                </form>
            )}

            {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)' }}>{error}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '22px 0 24px' }}>
                <div style={card}><div style={statLabel}>Total labels</div><div style={statValue} data-testid="stat-total">{stats.total}</div></div>
                <div style={card}><div style={statLabel}>Groups</div><div style={statValue} data-testid="stat-groups">{stats.groups}</div></div>
                <div style={card}><div style={statLabel}>Most used</div><div style={statValue} data-testid="stat-mostused">{stats.mostUsed}</div></div>
                <div style={card}><div style={statLabel}>Total uses</div><div style={statValue} data-testid="stat-totaluses">{stats.totalUses}</div></div>
            </div>

            {labelsQ.isLoading && <p style={{ color: 'var(--fg3)' }}>Loading…</p>}
            {!labelsQ.isLoading && labels.length === 0 && <p style={{ color: 'var(--fg3)', fontSize: 13 }}>No labels yet.</p>}

            {grouped.map((g) => (
                <div key={g.group ?? '__ungrouped'} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8, padding: '0 2px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--fg3)' }}>{g.group ?? 'Other'}</span>
                        {g.exclusive && (
                            <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 5, padding: '1px 6px' }}>Group · one of</span>
                        )}
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        {g.labels.map((l) => (
                            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                <LabelChip name={l.name} color={l.color} />
                                <span style={{ flex: 1 }} />
                                <span style={{ ...mono, fontSize: 12, color: 'var(--fg3)', width: 120, textAlign: 'right' }}>{l.issue_count ?? 0} uses</span>
                                {canDevelop && (
                                    <div style={{ display: 'flex', gap: 9 }}>
                                        {SWATCHES.map((hex) => (
                                            <button key={hex} type="button" aria-label={`recolor ${l.name} ${hex}`} data-testid={`recolor-${l.id}`} onClick={() => recolor(l, hex)}
                                                style={{ width: 16, height: 16, borderRadius: 5, cursor: 'pointer', border: 'none', background: hex, boxShadow: l.color === hex ? '0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg2)' : 'none' }} />
                                        ))}
                                    </div>
                                )}
                                {canDevelop && (
                                    <button type="button" title="Delete" data-testid={`delete-${l.id}`} onClick={() => remove(l)}
                                        style={{ border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', width: 24, height: 24, borderRadius: 6, fontSize: 15, lineHeight: 1 }}>×</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
