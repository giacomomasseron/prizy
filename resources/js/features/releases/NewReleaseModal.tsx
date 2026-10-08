import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { alertBox, fieldLabel, modalBody, modalFooter, modalHeader, modalTitle } from '../settings/settingsStyles';
import { tint } from '../support/supportStyles';
import { useCreateRelease } from './hooks';
import { ApiError } from '../../lib/apiClient';

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

    // v2: the settings dialog frame (header / body / footer) with v2 fields and ink buttons.
    return (
        <Modal open={open} onClose={onClose} width={440} label="New release">
            <div style={modalHeader}>
                <h2 style={modalTitle}>New release</h2>
            </div>

            <div style={modalBody}>
                <div>
                    <label htmlFor="new-release-name" style={fieldLabel}>Name</label>
                    <Input id="new-release-name" autoFocus placeholder="e.g. v1.1" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div>
                    <label htmlFor="new-release-target-date" style={fieldLabel}>Target date</label>
                    <Input id="new-release-target-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                </div>

                {error && <div role="alert" style={{ ...alertBox, color: 'var(--red)', background: tint('var(--red)', 10) }}>{error}</div>}
            </div>

            <div style={modalFooter}>
                <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={submit} disabled={!canCreate}>Create release</Button>
            </div>
        </Modal>
    );
}
