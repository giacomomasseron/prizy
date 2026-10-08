import { useState } from 'react';
import { useSlaPolicies, useDeleteSlaPolicy } from './hooks';
import { SlaPolicyModal } from './SlaPolicyModal';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/apiClient';
import type { SlaPolicy } from '../../lib/types';
import { DELETE_X_CLASSES, deleteXStyle, emptyState } from '../projects/projectStyles';
import { ROW_CLASSES, listCard, pageFrame, pageLead, pageTitle, titleRow } from '../settings/settingsStyles';

function summarizeTargets(policy: SlaPolicy): string {
    return `First ${policy.first_reply_minutes}m · Next ${policy.next_reply_minutes ?? '—'} · Resolution ${policy.resolution_minutes}m`;
}

export default function SlaPoliciesSettingsPage() {
    const policiesQ = useSlaPolicies();
    const del = useDeleteSlaPolicy();
    const confirm = useConfirm();

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<SlaPolicy | undefined>(undefined);
    const [error, setError] = useState('');

    const policies = policiesQ.data ?? [];

    function openCreate() {
        setEditing(undefined);
        setError('');
        setModalOpen(true);
    }

    function openEdit(policy: SlaPolicy) {
        setEditing(policy);
        setError('');
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditing(undefined);
    }

    async function remove(policy: SlaPolicy) {
        setError('');
        if (!(await confirm({ title: `Delete SLA policy "${policy.name}"?`, danger: true }))) return;
        del.mutateAsync(policy.id).catch((err) =>
            setError(err instanceof ApiError ? err.detail : 'Failed to delete SLA policy.'));
    }

    return (
        <div style={pageFrame}>
            <div style={titleRow}>
                <div>
                    <h1 style={pageTitle}><span className="hl">SLA policies</span></h1>
                    <p style={pageLead}>
                        Policies define first reply, next reply, and resolution targets for tickets, optionally scoped to a business-hours schedule.
                    </p>
                </div>
                <Button onClick={openCreate} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    New policy
                </Button>
            </div>

            {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)' }}>{error}</p>}

            {policiesQ.isLoading && <p style={{ color: 'var(--fg3)' }}>Loading…</p>}
            {!policiesQ.isLoading && policies.length === 0 && (
                <div style={{ ...emptyState, marginTop: 20 }}>No SLA policies yet.</div>
            )}

            {policies.length > 0 && (
                <div style={{ ...listCard, marginTop: 20 }}>
                    {policies.map((p) => (
                        <div
                            key={p.id}
                            data-testid={`sla-policy-row-${p.id}`}
                            className={ROW_CLASSES}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', overflowWrap: 'anywhere' }}>{p.name}</span>
                                <span style={{ fontSize: 12, color: 'var(--fg3)', overflowWrap: 'anywhere' }}>{summarizeTargets(p)} · {p.schedule_name ?? '24/7'}</span>
                            </div>
                            <span style={{ flex: 1 }} />
                            <Button variant="secondary" size="sm" data-testid={`edit-${p.id}`} onClick={() => openEdit(p)}>
                                Edit
                            </Button>
                            <button
                                type="button"
                                title="Delete"
                                data-testid={`delete-${p.id}`}
                                onClick={() => remove(p)}
                                className={DELETE_X_CLASSES}
                                style={{ ...deleteXStyle, width: 24, height: 24, padding: 0, flexShrink: 0 }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <SlaPolicyModal open={modalOpen} policy={editing} onClose={closeModal} />
        </div>
    );
}
