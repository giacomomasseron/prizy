import { useState, type CSSProperties } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Switch';
import { chipClasses, chipStyle } from '../issues/issueStyles';
import { alertBox, fieldLabel, modalBody, modalFooter, modalHeader, modalSub, modalTitle } from '../settings/settingsStyles';
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

// ─── styles ──────────────────────────────────────────────────────────────────

function capRow(on: boolean): CSSProperties {
    return {
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-row)',
        border: `var(--line) solid ${on ? 'var(--accent)' : 'var(--border)'}`,
        background: on ? 'var(--accent2)' : 'transparent',
    };
}
const capTitle: CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--fg)' };
const capDesc: CSSProperties = { fontSize: 11.5, color: 'var(--fg3)' };

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
            {/* Header */}
            <div style={modalHeader}>
                {/* TODO: real workspace name once exposed */}
                <h2 style={modalTitle}>Invite to Prizy</h2>
                <p style={modalSub}>Invite a teammate. They'll receive an email to accept.</p>
            </div>

            <div style={modalBody}>
                {/* Email address */}
                <div>
                    <label htmlFor="invite-email" style={fieldLabel}>Email address</label>
                    <Input
                        id="invite-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="colleague@example.com"
                    />
                </div>

                {/* Administrative level chips (ink when active) */}
                <div>
                    <div style={fieldLabel}>Administrative level</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {CHIP_LEVELS.map(l => {
                            const active = level === l;
                            return (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => setLevel(l)}
                                    aria-pressed={active}
                                    style={chipStyle}
                                    className={chipClasses(active)}
                                >
                                    <span
                                        aria-hidden="true"
                                        style={{ width: 8, height: 8, borderRadius: '50%', background: LEVELS[l].color, flexShrink: 0 }}
                                    />
                                    {LEVELS[l].label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Capabilities */}
                <div>
                    <div style={fieldLabel}>Capabilities</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={capRow(isDeveloper)}>
                            <div style={{ flex: 1 }}>
                                <div style={capTitle}>Developer</div>
                                <div style={capDesc}>Access to Issues, Projects, Roadmap</div>
                            </div>
                            <Switch checked={isDeveloper} onChange={setIsDeveloper} ariaLabel="Developer" />
                        </div>
                        <div style={capRow(isAgent)}>
                            <div style={{ flex: 1 }}>
                                <div style={capTitle}>Agent</div>
                                <div style={capDesc}>Access to Support module</div>
                            </div>
                            <Switch checked={isAgent} onChange={setIsAgent} ariaLabel="Agent" />
                        </div>
                    </div>
                </div>

                {/* No-access warning: member-level with no capability */}
                {showNoAccess && (
                    <div
                        role="alert"
                        style={{
                            ...alertBox,
                            background: 'rgba(224,161,58,.08)',
                            border: '1px solid rgba(224,161,58,.3)',
                            color: 'var(--amber-ink)',
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
                        style={{ color: 'var(--red-ink)', fontSize: 12.5 }}
                    >
                        {errorMsg}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={modalFooter}>
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
                <Button size="sm" onClick={handleSend} disabled={disabled || invite.isPending}>Send invite</Button>
            </div>
        </Modal>
    );
}
