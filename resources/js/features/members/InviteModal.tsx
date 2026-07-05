import { useState } from 'react';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Switch';
import { LEVELS } from './levels';
import { useInviteMember } from './workspaceHooks';

// ─── types ───────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    onClose(): void;
}

type Level = 'admin' | 'member' | 'viewer';

// Exclude 'owner' — the web endpoint only accepts admin | member | viewer
const CHIP_LEVELS: Level[] = ['admin', 'member', 'viewer'];

// ─── component ────────────────────────────────────────────────────────────────

export function InviteModal({ open, onClose }: Props) {
    const [email, setEmail] = useState('');
    const [level, setLevel] = useState<Level>('member');
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [isAgent, setIsAgent] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const invite = useInviteMember();

    const showNoAccess = level === 'member' && !isDeveloper && !isAgent;
    const disabled = !email || (level === 'member' && !isDeveloper && !isAgent);

    function reset() {
        setEmail('');
        setLevel('member');
        setIsDeveloper(false);
        setIsAgent(false);
        setErrorMsg(null);
    }

    function handleClose() {
        reset();
        onClose();
    }

    function handleSend() {
        setErrorMsg(null);
        invite.mutate(
            { email, admin_level: level, is_developer: isDeveloper, is_agent: isAgent },
            {
                onSuccess: () => { reset(); onClose(); },
                onError: (err: unknown) => {
                    const msg = err instanceof Error ? err.message : null;
                    setErrorMsg(msg || 'Could not send invite.');
                },
            },
        );
    }

    return (
        <Modal open={open} onClose={handleClose} width={520}>
            <div style={{ padding: '24px 28px' }}>
                {/* Header */}
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>
                    {/* TODO: real workspace name once exposed */}
                    Invite to Prizy
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--fg2)', margin: '0 0 18px' }}>
                    Invite a teammate. They'll receive an email to accept.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Email address */}
                    <div>
                        <label
                            htmlFor="invite-email"
                            style={{
                                display: 'block',
                                fontSize: 12,
                                color: 'var(--fg3)',
                                fontWeight: 500,
                                marginBottom: 6,
                            }}
                        >
                            Email address
                        </label>
                        <Input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="colleague@example.com"
                        />
                    </div>

                    {/* Administrative level chips */}
                    <div>
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--fg3)',
                                fontWeight: 500,
                                marginBottom: 8,
                            }}
                        >
                            Administrative level
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {CHIP_LEVELS.map(l => {
                                const active = level === l;
                                return (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setLevel(l)}
                                        aria-pressed={active}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 7,
                                            padding: '6px 11px',
                                            borderRadius: 8,
                                            border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                            background: active ? 'var(--accent2)' : 'none',
                                            color: active ? 'var(--fg)' : 'var(--fg2)',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        {LEVELS[l].label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Capabilities */}
                    <div>
                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--fg3)',
                                fontWeight: 500,
                                marginBottom: 8,
                            }}
                        >
                            Capabilities
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Developer row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    borderRadius: 11,
                                    border: `1px solid ${isDeveloper ? 'var(--accent)' : 'var(--border)'}`,
                                    background: isDeveloper ? 'var(--accent2)' : 'none',
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13 }}>Developer</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>
                                        Access to Issues, Projects, Roadmap
                                    </div>
                                </div>
                                <Switch
                                    checked={isDeveloper}
                                    onChange={setIsDeveloper}
                                    ariaLabel="Developer"
                                />
                            </div>

                            {/* Agent row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px 14px',
                                    borderRadius: 11,
                                    border: `1px solid ${isAgent ? 'var(--accent)' : 'var(--border)'}`,
                                    background: isAgent ? 'var(--accent2)' : 'none',
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13 }}>Agent</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--fg3)' }}>
                                        Access to Support module
                                    </div>
                                </div>
                                <Switch
                                    checked={isAgent}
                                    onChange={setIsAgent}
                                    ariaLabel="Agent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* No-access warning: member-level with no capability */}
                    {showNoAccess && (
                        <div
                            role="alert"
                            style={{
                                background: 'rgba(224,161,58,.08)',
                                border: '1px solid rgba(224,161,58,.3)',
                                borderRadius: 9,
                                padding: '10px 14px',
                                color: 'var(--amber)',
                                fontSize: 13,
                            }}
                        >
                            ⚠ This member will have no access to any module.
                        </div>
                    )}

                    {/* Inline error (422 / network failures) */}
                    {errorMsg && (
                        <div
                            role="alert"
                            data-testid="invite-error"
                            style={{ color: 'var(--red)', fontSize: 12.5 }}
                        >
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 10,
                        marginTop: 20,
                    }}
                >
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            border: '1px solid var(--border)',
                            borderRadius: 9,
                            padding: '8px 15px',
                            fontSize: 12.5,
                            color: 'var(--fg2)',
                            background: 'none',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={disabled || invite.isPending}
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 9,
                            padding: '8px 15px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: disabled || invite.isPending ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            opacity: disabled || invite.isPending ? 0.5 : 1,
                        }}
                    >
                        Send invite
                    </button>
                </div>
            </div>
        </Modal>
    );
}
