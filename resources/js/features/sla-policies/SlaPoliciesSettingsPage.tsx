import { useState } from 'react';
import { useSlaPolicies, useDeleteSlaPolicy } from './hooks';
import { SlaPolicyModal } from './SlaPolicyModal';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { ApiError } from '../../lib/apiClient';
import type { SlaPolicy } from '../../lib/types';

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
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 30px 80px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, letterSpacing: '-.02em' }}>SLA policies</h1>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg2)', maxWidth: 600 }}>
                        Policies define first reply, next reply, and resolution targets for tickets, optionally scoped to a business-hours schedule.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    style={{ marginLeft: 'auto', border: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >
                    New policy
                </button>
            </div>

            {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--red)' }}>{error}</p>}

            {policiesQ.isLoading && <p style={{ color: 'var(--fg3)' }}>Loading…</p>}
            {!policiesQ.isLoading && policies.length === 0 && (
                <p style={{ color: 'var(--fg3)', fontSize: 13, marginTop: 20 }}>No SLA policies yet.</p>
            )}

            {policies.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
                    {policies.map((p) => (
                        <div
                            key={p.id}
                            data-testid={`sla-policy-row-${p.id}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
                                <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>{summarizeTargets(p)} · {p.schedule_name ?? '24/7'}</span>
                            </div>
                            <span style={{ flex: 1 }} />
                            <button
                                type="button"
                                data-testid={`edit-${p.id}`}
                                onClick={() => openEdit(p)}
                                style={{ border: '1px solid var(--border)', color: 'var(--fg2)', background: 'transparent', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                title="Delete"
                                data-testid={`delete-${p.id}`}
                                onClick={() => remove(p)}
                                style={{ border: 'none', background: 'none', color: 'var(--fg3)', cursor: 'pointer', width: 24, height: 24, borderRadius: 6, fontSize: 15, lineHeight: 1 }}
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
