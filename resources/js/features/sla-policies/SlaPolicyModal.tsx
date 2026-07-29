import { useEffect, useState, type CSSProperties } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useCreateSlaPolicy, useUpdateSlaPolicy } from './hooks';
import { useSchedules } from '../business-hours/hooks';
import { ApiError } from '../../lib/apiClient';
import type { SlaPolicy } from '../../lib/types';

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 };

export interface SlaPolicyModalProps {
    open: boolean;
    policy?: SlaPolicy;
    onClose(): void;
}

export function SlaPolicyModal({ open, policy, onClose }: SlaPolicyModalProps) {
    const create = useCreateSlaPolicy();
    const update = useUpdateSlaPolicy();
    const schedulesQ = useSchedules();
    const isEditing = !!policy;

    const [name, setName] = useState('');
    const [firstReplyMinutes, setFirstReplyMinutes] = useState('');
    const [nextReplyMinutes, setNextReplyMinutes] = useState('');
    const [resolutionMinutes, setResolutionMinutes] = useState('');
    const [scheduleId, setScheduleId] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setName(policy?.name ?? '');
        setFirstReplyMinutes(policy ? String(policy.first_reply_minutes) : '');
        setNextReplyMinutes(policy?.next_reply_minutes != null ? String(policy.next_reply_minutes) : '');
        setResolutionMinutes(policy ? String(policy.resolution_minutes) : '');
        setScheduleId(policy?.schedule_id ?? '');
        setError(null);
        // Re-run only when the modal opens or the policy being edited changes (not on every parent re-render).
    }, [open, policy?.id]);

    const schedules = schedulesQ.data ?? [];
    const pending = create.isPending || update.isPending;
    const canSubmit = name.trim() !== '' && firstReplyMinutes.trim() !== '' && resolutionMinutes.trim() !== '' && !pending;

    async function submit() {
        if (!canSubmit) return;
        setError(null);
        const payload = {
            name: name.trim(),
            first_reply_minutes: Number(firstReplyMinutes),
            next_reply_minutes: nextReplyMinutes.trim() ? Number(nextReplyMinutes) : null,
            resolution_minutes: Number(resolutionMinutes),
            schedule_id: scheduleId || null,
        };
        try {
            if (isEditing && policy) {
                await update.mutateAsync({ id: policy.id, ...payload });
            } else {
                await create.mutateAsync(payload);
            }
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : `Failed to ${isEditing ? 'update' : 'create'} SLA policy.`);
        }
    }

    return (
        <Modal open={open} onClose={onClose} width={560} label={isEditing ? 'Edit SLA policy' : 'New SLA policy'}>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{isEditing ? 'Edit SLA policy' : 'New SLA policy'}</h2>

                <div>
                    <label htmlFor="sla-policy-name" style={fieldLabel}>Name</label>
                    <Input
                        id="sla-policy-name"
                        aria-label="Policy name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Priority support"
                        maxLength={64}
                    />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="sla-policy-first-reply" style={fieldLabel}>First reply (minutes)</label>
                        <Input
                            id="sla-policy-first-reply"
                            aria-label="First reply minutes"
                            type="number"
                            min="1"
                            required
                            value={firstReplyMinutes}
                            onChange={(e) => setFirstReplyMinutes(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="sla-policy-next-reply" style={fieldLabel}>Next reply (minutes)</label>
                        <Input
                            id="sla-policy-next-reply"
                            aria-label="Next reply minutes"
                            type="number"
                            min="1"
                            value={nextReplyMinutes}
                            onChange={(e) => setNextReplyMinutes(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="sla-policy-resolution" style={fieldLabel}>Resolution (minutes)</label>
                        <Input
                            id="sla-policy-resolution"
                            aria-label="Resolution minutes"
                            type="number"
                            min="1"
                            required
                            value={resolutionMinutes}
                            onChange={(e) => setResolutionMinutes(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="sla-policy-schedule" style={fieldLabel}>Schedule</label>
                    <select
                        id="sla-policy-schedule"
                        aria-label="Schedule"
                        value={scheduleId}
                        onChange={(e) => setScheduleId(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: 9,
                            color: 'var(--fg)',
                            fontSize: 13,
                            padding: '6px 10px',
                            fontFamily: 'inherit',
                        }}
                    >
                        <option value="">24/7 (no schedule)</option>
                        {schedules.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ border: '1px solid var(--border)', color: 'var(--fg2)', background: 'transparent', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canSubmit}
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            borderRadius: 9,
                            padding: '8px 15px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            border: 'none',
                            cursor: canSubmit ? 'pointer' : 'not-allowed',
                            opacity: canSubmit ? 1 : 0.5,
                            fontFamily: 'inherit',
                        }}
                    >
                        {isEditing ? 'Save changes' : 'Create policy'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
