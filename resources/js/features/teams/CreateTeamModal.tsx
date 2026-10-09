import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { TeamTile } from '../../components/ui/TeamTile';
import { useCreateTeam } from './hooks';
import { ApiError } from '../../lib/apiClient';
import { fieldLabel, modalBody, modalFooter, modalHeader, modalSub, modalTitle, swatchStyle } from '../settings/settingsStyles';

const COLORS = ['#6366f1', '#e0a13a', '#4bab66', '#5b8def', '#eb5757', '#a855f7'];

function suggestIdentifier(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3);
}

export default function CreateTeamModal({ open, onClose }: { open: boolean; onClose(): void }) {
    const [name, setName] = useState('');
    const [identifier, setIdentifier] = useState('');
    const [idTouched, setIdTouched] = useState(false);
    const [color, setColor] = useState(COLORS[0]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const create = useCreateTeam();

    function reset() {
        setName(''); setIdentifier(''); setIdTouched(false); setColor(COLORS[0]); setErrorMsg(null);
    }

    useEffect(() => { if (!open) reset(); }, [open]);

    function onName(v: string) {
        setName(v);
        if (!idTouched) setIdentifier(suggestIdentifier(v));
    }

    const disabled = !name.trim() || !identifier.trim() || create.isPending;

    function submit() {
        setErrorMsg(null);
        create.mutate(
            { name: name.trim(), identifier: identifier.trim(), color },
            {
                onSuccess: () => { reset(); onClose(); },
                onError: (e) => setErrorMsg((e as ApiError).message),
            },
        );
    }

    return (
        <Modal open={open} onClose={onClose} width={480}>
            <div style={modalHeader}>
                <h2 style={modalTitle}>Create team</h2>
                <p style={modalSub}>Teams group issues, projects, and cycles.</p>
            </div>
            <div style={modalBody}>
                <div>
                    <label htmlFor="create-team-name" style={fieldLabel}>Team name</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Live preview of the team tile */}
                        <TeamTile identifier={identifier} color={color} size={40} />
                        <Input
                            id="create-team-name"
                            aria-label="Team name"
                            value={name}
                            onChange={(e) => onName(e.target.value)}
                            placeholder="Engineering"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="create-team-identifier" style={fieldLabel}>Identifier</label>
                    <Input
                        id="create-team-identifier"
                        aria-label="Identifier"
                        value={identifier}
                        maxLength={8}
                        onChange={(e) => {
                            setIdTouched(true);
                            setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                        }}
                        placeholder="ENG"
                    />
                </div>
                <div>
                    <div style={fieldLabel}>Color</div>
                    <div role="group" aria-label="Colour" style={{ display: 'flex', gap: 9 }}>
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={`Color ${c}`}
                                aria-pressed={color === c}
                                onClick={() => setColor(c)}
                                style={swatchStyle(c, color === c, 26)}
                            />
                        ))}
                    </div>
                </div>
                {errorMsg && (
                    <div
                        role="alert"
                        data-testid="create-team-error"
                        style={{ color: 'var(--red-ink)', fontSize: 12.5 }}
                    >
                        {errorMsg}
                    </div>
                )}
            </div>
            <div style={modalFooter}>
                <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={submit} disabled={disabled}>Create team</Button>
            </div>
        </Modal>
    );
}
