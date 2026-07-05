import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useCreateTeam } from './hooks';
import { ApiError } from '../../lib/apiClient';

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
            <div style={{ padding: '24px 28px' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Create team</h2>
                <p style={{ fontSize: 12.5, color: 'var(--fg2)', marginBottom: 18 }}>
                    Teams group issues, projects, and cycles.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label
                            htmlFor="create-team-name"
                            style={{ display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 }}
                        >
                            Team name
                        </label>
                        <Input
                            id="create-team-name"
                            aria-label="Team name"
                            value={name}
                            onChange={(e) => onName(e.target.value)}
                            placeholder="Engineering"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="create-team-identifier"
                            style={{ display: 'block', fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 6 }}
                        >
                            Identifier
                        </label>
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
                        <div style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 500, marginBottom: 8 }}>Color</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-label={`Color ${c}`}
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: 6,
                                        background: c,
                                        border: color === c ? '2px solid var(--fg)' : '2px solid transparent',
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    {errorMsg && (
                        <div
                            role="alert"
                            data-testid="create-team-error"
                            style={{ color: 'var(--red)', fontSize: 12.5 }}
                        >
                            {errorMsg}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            border: '1px solid var(--border)',
                            color: 'var(--fg2)',
                            background: 'transparent',
                            borderRadius: 9,
                            padding: '8px 15px',
                            fontSize: 12.5,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={disabled}
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            borderRadius: 9,
                            padding: '8px 15px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            border: 'none',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            fontFamily: 'inherit',
                        }}
                    >
                        Create team
                    </button>
                </div>
            </div>
        </Modal>
    );
}
