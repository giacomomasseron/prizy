import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useCreateRelease } from './hooks';
import { ApiError } from '../../lib/apiClient';

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 };

export function NewReleaseModal({ open, onClose }: { open: boolean; onClose(): void }) {
    const navigate = useNavigate();
    const create = useCreateRelease();
    const [name, setName] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setName(''); setTargetDate(''); setError(null);
        }
    }, [open]);

    const canCreate = name.trim() !== '' && !create.isPending;

    function submit() {
        if (!canCreate) return;
        setError(null);
        create.mutate(
            { name: name.trim(), target_date: targetDate || null },
            {
                onSuccess: (release) => { onClose(); navigate(`/releases/${release.id}`); },
                onError: (e) => setError(e instanceof ApiError ? e.detail : 'Could not create the release. Please try again.'),
            },
        );
    }

    return (
        <Modal open={open} onClose={onClose} width={440} label="New release">
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>New release</h2>

                <div>
                    <label htmlFor="new-release-name" style={fieldLabel}>Name</label>
                    <Input id="new-release-name" autoFocus placeholder="e.g. v1.1" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div>
                    <label htmlFor="new-release-target-date" style={fieldLabel}>Target date</label>
                    <Input id="new-release-target-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                </div>

                {error && <div role="alert" style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={onClose} style={{ border: '1px solid var(--border)', color: 'var(--fg2)', background: 'transparent', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canCreate}
                        style={{ background: 'var(--accent)', color: '#fff', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed', opacity: canCreate ? 1 : 0.5, fontFamily: 'inherit' }}
                    >
                        Create release
                    </button>
                </div>
            </div>
        </Modal>
    );
}
