import { useState, type CSSProperties } from 'react';
import { ApiError } from '../../lib/apiClient';
import { useMe } from '../../auth/useAuth';
import { canUseTracker, canDevelop as canDevelopFor } from '../../auth/capabilities';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LabelChip } from '../../components/ui/LabelChip';
import type { Label } from '../../lib/types';
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from './hooks';
import { groupLabels, labelStats } from './labelGroups';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { DELETE_X_CLASSES, deleteXStyle, emptyState } from '../projects/projectStyles';
import {
    ROW_CLASSES, groupLabel, listCard, pageFrame, pageLead, pageTitle,
    statCard, statGrid, statLabel, statValue, swatchStyle, titleRow,
} from '../settings/settingsStyles';

const SWATCHES = ['#eb5757', '#e0894a', '#d0a23a', '#3a9a68', '#3aa8a0', '#5b8def'];

const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };
const exclusiveBadge: CSSProperties = { fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--accent)', background: 'var(--accent2)', borderRadius: 5, padding: '1px 6px' };
const xBtn: CSSProperties = { ...deleteXStyle, width: 24, height: 24, padding: 0, flexShrink: 0 };

export default function LabelsSettingsPage() {
    const me = useMe();
    const canDevelop = canDevelopFor(me.data);
    const labelsQ = useLabels({ enabled: canUseTracker(me.data) });
    const create = useCreateLabel();
    const update = useUpdateLabel();
    const del = useDeleteLabel();
    const confirm = useConfirm();

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

    async function remove(l: Label) {
        setError('');
        if (!(await confirm({ title: `Delete label "${l.name}"?`, danger: true }))) return;
        del.mutateAsync(l.id).catch((err) =>
            setError(err instanceof ApiError ? err.detail : 'Failed to delete label.'));
    }

    return (
        <div style={pageFrame}>
            <div style={titleRow}>
                <div>
                    <h1 style={pageTitle}><span className="hl">Labels</span></h1>
                    <p style={pageLead}>
                        Labels categorize issues across the workspace. Grouped labels are mutually exclusive within their group.
                    </p>
                </div>
                {canDevelop && (
                    <Button onClick={() => { setError(''); setOpen((o) => !o); }} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        New label
                    </Button>
                )}
            </div>

            {canDevelop && open && (
                <form onSubmit={submit} style={{ border: 'var(--line) solid var(--border2)', borderRadius: 'var(--radius-card)', background: 'var(--panel)', padding: 16, margin: '20px 0 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label name" aria-label="Label name" maxLength={64}
                            style={{ flex: '1 1 200px', width: 'auto' }} />
                        <Input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group (optional)" aria-label="Label group" list="label-groups" maxLength={64}
                            style={{ width: 180 }} />
                        <datalist id="label-groups">{existingGroups.map((g) => <option key={g} value={g} />)}</datalist>
                        <Button size="sm" type="submit" disabled={create.isPending}>Add label</Button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ ...groupLabel, width: 44 }}>Color</span>
                        {SWATCHES.map((hex) => (
                            <button key={hex} type="button" aria-label={`color ${hex}`} onClick={() => setColor(hex)}
                                style={swatchStyle(hex, color === hex, 24)} />
                        ))}
                    </div>
                </form>
            )}

            {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)' }}>{error}</p>}

            <div style={statGrid}>
                <div style={statCard}><div style={statLabel}>Total labels</div><div style={statValue} data-testid="stat-total">{stats.total}</div></div>
                <div style={statCard}><div style={statLabel}>Groups</div><div style={statValue} data-testid="stat-groups">{stats.groups}</div></div>
                <div style={statCard}><div style={statLabel}>Most used</div><div style={statValue} title={stats.mostUsed} data-testid="stat-mostused">{stats.mostUsed}</div></div>
                <div style={statCard}><div style={statLabel}>Total uses</div><div style={statValue} data-testid="stat-totaluses">{stats.totalUses}</div></div>
            </div>

            {labelsQ.isLoading && <p style={{ color: 'var(--fg3)' }}>Loading…</p>}
            {!labelsQ.isLoading && labels.length === 0 && <div style={emptyState}>No labels yet.</div>}

            {grouped.map((g) => (
                <div key={g.group ?? '__ungrouped'} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8, padding: '0 2px' }}>
                        <span style={groupLabel}>{g.group ?? 'Other'}</span>
                        {g.exclusive && <span style={exclusiveBadge}>Group · one of</span>}
                    </div>
                    <div style={listCard}>
                        {g.labels.map((l) => (
                            <div key={l.id} className={ROW_CLASSES} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                                <LabelChip name={l.name} color={l.color} />
                                <span style={{ flex: 1 }} />
                                <span style={{ ...mono, fontSize: 12, color: 'var(--fg3)', width: 120, textAlign: 'right', flexShrink: 0 }}>{l.issue_count ?? 0} uses</span>
                                {canDevelop && (
                                    <div style={{ display: 'flex', gap: 9, flexShrink: 0 }}>
                                        {SWATCHES.map((hex) => (
                                            <button key={hex} type="button" aria-label={`recolor ${l.name} ${hex}`} data-testid={`recolor-${l.id}`} onClick={() => recolor(l, hex)}
                                                style={swatchStyle(hex, l.color === hex, 16)} />
                                        ))}
                                    </div>
                                )}
                                {canDevelop && (
                                    <button type="button" title="Delete" data-testid={`delete-${l.id}`} onClick={() => remove(l)}
                                        className={DELETE_X_CLASSES} style={xBtn}>×</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
