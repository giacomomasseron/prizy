import { useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError } from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { QueryState } from '../../components/ui/QueryState';
import { useDeleteWorkspace, useWorkspace } from './hooks';

// The Settings v2 design's danger card and its confirmation dialog.
const card: CSSProperties = { border: 'var(--line) solid var(--red)', background: 'var(--panel)', borderRadius: 22, padding: '22px 24px', boxShadow: '5px 5px 0 var(--red)' };
const display = (fontSize: number, letterSpacing: string): CSSProperties => ({ margin: 0, fontFamily: 'var(--font-display)', fontSize, fontWeight: 800, letterSpacing, color: 'var(--fg)' });
const ownerPill: CSSProperties = { fontSize: 11.5, fontWeight: 700, color: 'var(--amber-ink)', background: 'color-mix(in srgb, var(--amber) 13%, transparent)', borderRadius: 'var(--radius-pill)', padding: '2px 10px' };
const pill: CSSProperties = { borderWidth: 'var(--line)', borderStyle: 'solid', padding: '9px 18px', borderRadius: 'var(--radius-pill)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', lineHeight: 1, cursor: 'pointer', flexShrink: 0 };
// Colours in classes, so hover can change them (an inline colour would beat hover:).
const OPEN_CLASSES = 'border-red bg-transparent text-red-ink hover:bg-red hover:text-on-accent';
const listBox: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 7, margin: '0 0 18px', padding: '14px 16px', borderRadius: 16, background: 'var(--bg2)', border: 'var(--line) solid var(--border)', fontSize: 14, color: 'var(--fg)' };
const input: CSSProperties = { height: 46, borderRadius: 14, borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 14.5, padding: '0 14px', outline: 'none' };
const INPUT_CLASSES = 'border-field focus:border-red focus:shadow-[3px_3px_0_var(--red)]';
const errorText: CSSProperties = { margin: '10px 0 0', fontSize: 13, color: 'var(--red-ink)' };

function bang(size: number, radius: number, fontSize: number): CSSProperties {
    return { width: size, height: size, flexShrink: 0, borderRadius: radius, background: 'var(--red)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: 800 };
}

function count(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export function DeleteWorkspaceCard() {
    const [open, setOpen] = useState(false);

    return (
        <section style={{ ...card, marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <span aria-hidden="true" style={bang(42, 14, 19)}>!</span>
                <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 style={display(19, '-.02em')}>Delete workspace</h2>
                        <span style={ownerPill}>Owner only</span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--fg2)', textWrap: 'pretty' }}>
                        Permanently removes every issue, ticket, article and member. This can't be undone.
                    </p>
                </div>
                <button type="button" onClick={() => setOpen(true)} className={OPEN_CLASSES} style={pill}>Delete workspace…</button>
            </div>
            {open && <DeleteWorkspaceDialog onClose={() => setOpen(false)} />}
        </section>
    );
}

function DeleteWorkspaceDialog({ onClose }: { onClose(): void }) {
    const workspace = useWorkspace();
    const remove = useDeleteWorkspace();
    const [typed, setTyped] = useState('');
    const [error, setError] = useState('');
    const name = workspace.data?.name ?? '';
    const match = name !== '' && typed.trim() === name;
    // Still busy once it succeeded: the page is on its way to the login screen.
    const busy = remove.isPending || remove.isSuccess;

    async function confirm(e: FormEvent) {
        e.preventDefault();
        if (!match || busy) return;
        setError('');
        try {
            await remove.mutateAsync(typed.trim());
            window.location.assign('/login');
        } catch (err) {
            setError(err instanceof ApiError ? (err.errors?.confirm?.[0] ?? err.detail) : "Couldn't delete the workspace. Try again.");
        }
    }

    const members = workspace.data?.member_count ?? 0;
    const teams = workspace.data?.team_count ?? 0;
    const items = [
        `${count(members, 'member')} and their access`,
        `${count(teams, 'team')} with all issues and cycles`,
        'Every support ticket, contact and help article',
        'Integrations and labels',
    ];

    return (
        <Modal open onClose={() => { if (!busy) onClose(); }} width={480} label={name ? `Delete ${name}?` : 'Delete workspace'}>
            <div style={{ padding: '26px 28px' }}>
                <QueryState query={workspace} what="the workspace">
                    <form onSubmit={confirm}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span aria-hidden="true" style={bang(38, 12, 18)}>!</span>
                            <h2 style={display(24, '-.03em')}>Delete {name}?</h2>
                        </div>
                        <p style={{ margin: '0 0 14px', fontSize: 14.5, color: 'var(--fg2)', textWrap: 'pretty' }}>
                            This permanently deletes the workspace for {members === 1 ? 'its one member' : `all ${members} members`}:
                        </p>
                        <ul style={{ ...listBox, listStyle: 'none' }}>
                            {items.map((item) => (
                                <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                                    <span aria-hidden="true" style={{ color: 'var(--red-ink)', fontWeight: 800 }}>✕</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--fg2)' }}>
                            <span>
                                Type <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--on-hi)', background: 'var(--hi)', padding: '1px 6px', borderRadius: 6 }}>{name}</b> to confirm
                            </span>
                            <input
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                                placeholder={name}
                                autoComplete="off"
                                spellCheck={false}
                                disabled={busy}
                                className={INPUT_CLASSES}
                                style={input}
                            />
                        </label>
                        {error && <p role="alert" style={errorText}>{error}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <Button variant="secondary" onClick={onClose} disabled={busy} style={{ padding: '9px 18px' }}>Cancel</Button>
                            <Button type="submit" variant="danger" disabled={!match || busy} style={{ padding: '9px 18px', ...(!match || busy ? { opacity: 0.4 } : {}) }}>
                                {busy ? 'Deleting…' : 'Delete forever'}
                            </Button>
                        </div>
                    </form>
                </QueryState>
            </div>
        </Modal>
    );
}
