import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/apiClient';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { canWorkHelpdesk } from '../../auth/capabilities';
import { sessionPost, useLogout, useMe } from '../../auth/useAuth';
import { useWorkspace } from '../settings/hooks';
import { SETUP_GUIDE_URL, SetupFrame, type SetupStep } from './SetupFrame';
import { WorkspaceMark } from './WorkspaceMark';
import {
    SETUP_LINK_CLASSES, setupCard, setupCardTitle, setupError, setupInput, setupLead, setupPill, setupTitle,
} from './setupStyles';

type Role = 'admin' | 'member' | 'agent' | 'guest';
type Row = { id: number; email: string; role: Role; error?: string };
type Sent = { email: string; role: Role };

const ROLE_LABELS: Record<Role, string> = { admin: 'Admin', member: 'Member · engineering', agent: 'Support agent', guest: 'Guest' };
const SENT_ROLE_LABELS: Record<Role, string> = { admin: 'Admin', member: 'Member', agent: 'Support agent', guest: 'Guest' };

/** What each role is in the app: an admin level and the tracker / support desk capabilities. */
function invitationFor(role: Role, helpdesk: boolean) {
    switch (role) {
        case 'admin': return { admin_level: 'admin' as const, is_developer: true, is_agent: helpdesk };
        case 'agent': return { admin_level: 'member' as const, is_developer: false, is_agent: true };
        case 'guest': return { admin_level: 'viewer' as const, is_developer: true, is_agent: false };
        default: return { admin_level: 'member' as const, is_developer: true, is_agent: false };
    }
}

function validEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** The rows with a well-formed address, the first of each address only (the server keeps one invitation per address). */
function uniqueValid(rows: Row[]): Row[] {
    const seen = new Set<string>();
    return rows.filter((r) => {
        const key = r.email.trim().toLowerCase();
        if (!validEmail(r.email) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function initialsOf(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';
}

/** The first message a failed invitation carries, for its row. */
function inviteError(err: unknown): string {
    if (err instanceof ApiError) {
        const first = err.errors && Object.values(err.errors)[0]?.[0];
        if (first) return first;
        if (err.status === 403) return 'Confirm your email address before sending invitations.';
    }
    return "Couldn't send this invitation. Try again.";
}

/**
 * Steps 2 and 3 of the Setup v2 wizard, on the new workspace's own host: the login link from sign-up lands here.
 * Step 1 (the workspace itself) was sign-up, so there is no going back to it; only the owner gets this page.
 */
export default function SetupPage() {
    const me = useMe().data;
    const workspaceQuery = useWorkspace();
    const workspace = workspaceQuery.data;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const logout = useLogout();

    const helpdesk = me?.workspace?.helpdesk_enabled === true;
    const verified = !!me?.email_verified_at;
    // A support-only owner works on the desk; everyone else starts on Today.
    const destination = canWorkHelpdesk(me) && !me?.is_developer ? '/support' : '/today';

    const nextId = useRef(4);
    const inputs = useRef(new Map<number, HTMLInputElement>());
    const [focusRow, setFocusRow] = useState<number | null>(null);
    const [step, setStep] = useState<2 | 3>(2);
    const [rows, setRows] = useState<Row[]>([
        { id: 1, email: '', role: 'admin' },
        { id: 2, email: '', role: 'member' },
        { id: 3, email: '', role: 'agent' },
    ]);
    const [bulk, setBulk] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<Sent[]>([]);
    const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

    // Without the support side there is no one to invite as an agent.
    useEffect(() => {
        if (me && !helpdesk) setRows((rs) => rs.map((r) => (r.role === 'agent' ? { ...r, role: 'member' } : r)));
    }, [me, helpdesk]);

    // A new row, or the neighbour of a removed one, takes the focus once it is drawn.
    useEffect(() => {
        if (focusRow === null) return;
        inputs.current.get(focusRow)?.focus();
        setFocusRow(null);
    }, [focusRow, rows]);

    // The confirmation link opens in another tab: look again whenever the owner comes back to this one.
    useEffect(() => {
        if (!me || verified) return;
        const recheck = () => {
            if (document.visibilityState !== 'hidden') void queryClient.invalidateQueries({ queryKey: ['me'] });
        };
        window.addEventListener('focus', recheck);
        document.addEventListener('visibilitychange', recheck);
        return () => {
            window.removeEventListener('focus', recheck);
            document.removeEventListener('visibilitychange', recheck);
        };
    }, [me, verified, queryClient]);

    // RequireAuth has loaded the user before this renders; until then there is nothing to set up.
    if (!me) return null;
    if (me.admin_level !== 'owner') return <Navigate to="/" replace />;

    const name = workspace?.name ?? '';
    const roles = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => helpdesk || r !== 'agent');
    const valid = uniqueValid(rows);
    const canSend = verified && valid.length > 0;

    function setRow(id: number, patch: Partial<Row>) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }
    function addRow() {
        const id = nextId.current++;
        setRows((rs) => [...rs, { id, email: '', role: 'member' }]);
        setFocusRow(id);
    }
    function removeRow(id: number) {
        const i = rows.findIndex((r) => r.id === id);
        if (rows.length > 1) {
            setRows((rs) => rs.filter((r) => r.id !== id));
            setFocusRow((rows[i + 1] ?? rows[i - 1]).id);
        } else {
            const fresh = nextId.current++;
            setRows([{ id: fresh, email: '', role: 'member' }]);
            setFocusRow(fresh);
        }
    }
    function onRowKey(e: KeyboardEvent<HTMLInputElement>, id: number) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const last = rows[rows.length - 1];
        if (last.id === id && last.email.trim()) addRow();
    }
    function addBulk() {
        const parts = bulk.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
        if (!parts.length) return;
        setRows((rs) => {
            const have = new Set(rs.map((r) => r.email.trim().toLowerCase()));
            const fresh: Row[] = [];
            for (const p of parts) {
                if (have.has(p.toLowerCase())) continue;
                have.add(p.toLowerCase());
                fresh.push({ id: nextId.current++, email: p, role: 'member' });
            }
            return [...rs.filter((r) => r.email.trim()), ...fresh];
        });
        setBulk('');
    }

    async function send() {
        if (sending || !canSend) return;
        setSending(true);
        const errors = new Map<number, string>();
        const delivered: Sent[] = [];
        for (const row of valid) {
            const email = row.email.trim();
            try {
                await sessionPost('/invitations', { email, ...invitationFor(row.role, helpdesk) });
                delivered.push({ email, role: row.role });
            } catch (err) {
                errors.set(row.id, inviteError(err));
            }
        }
        // An address that never looked like one was not tried: it stays, with why, so a typo is not lost.
        for (const row of rows) {
            if (row.email.trim() && !validEmail(row.email)) errors.set(row.id, 'This doesn’t look like an email address.');
        }
        setSending(false);
        // Inviting an address again renews its invitation (with the new role), so it is listed once.
        setSent((s) => {
            const byEmail = new Map(s.map((p) => [p.email.toLowerCase(), p]));
            for (const d of delivered) byEmail.set(d.email.toLowerCase(), d);
            return [...byEmail.values()];
        });
        if (delivered.length) void queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
        const left = rows.filter((r) => errors.has(r.id)).map((r) => ({ ...r, error: errors.get(r.id) }));
        if (left.length) {
            setRows(left);
        } else {
            setRows([{ id: nextId.current++, email: '', role: 'member' }]);
            setStep(3);
        }
    }

    async function resendLink() {
        setResend('sending');
        try {
            await sessionPost('/email/verification-notification', {});
            setResend('sent');
        } catch {
            setResend('failed');
        }
    }

    function signOut() {
        logout.mutate(undefined, { onSettled: () => window.location.assign('/login') });
    }

    const railLinks = (
        <>
            <a href={SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className={SETUP_LINK_CLASSES}>Setup guide ↗</a>
            <button
                type="button"
                onClick={signOut}
                className={SETUP_LINK_CLASSES}
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            >
                Sign in to a different account
            </button>
        </>
    );

    const frame = {
        step: step as SetupStep,
        done: (step === 3 ? [1, 2] : [1]) as SetupStep[],
        onStep: (n: SetupStep) => { if (n === 2) setStep(2); },
        canGoTo: (n: SetupStep) => n === 2,
        finishLater: { label: 'Finish later', onClick: () => navigate(destination), disabled: sending },
        railLinks,
    };

    if (step === 3) {
        return (
            <SetupFrame
                {...frame}
                footer={{
                    onBack: () => setStep(2),
                    skip: { label: 'Invite more people', onClick: () => setStep(2) },
                    primary: { label: 'Open workspace →', onClick: () => navigate(destination) },
                }}
            >
                <QueryState query={workspaceQuery} what="your workspace">
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 30 }}>
                    <WorkspaceMark name={name} color={workspace?.color} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h1 style={{ ...setupTitle, fontSize: 38, letterSpacing: '-.04em', lineHeight: 1.05, margin: '0 0 4px' }}>
                            <span className="hl">{name.trim() || 'Your workspace'} is ready</span>
                        </h1>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg3)' }}>{window.location.host}</div>
                    </div>
                    <span
                        aria-hidden="true"
                        className="setup-pop"
                        style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: 'var(--sup)', color: 'var(--on-sup)', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--line) solid var(--fg)', boxShadow: '3px 3px 0 var(--fg)', boxSizing: 'border-box' }}
                    >
                        ✓
                    </span>
                </div>

                <div style={{ border: 'var(--line) solid var(--fg)', borderRadius: 22, background: 'var(--panel)', overflow: 'hidden', boxShadow: '6px 6px 0 var(--fg)' }}>
                    <h2 style={{ margin: 0, padding: '14px 20px', borderBottom: 'var(--line) solid var(--border)', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' }}>
                        {sent.length ? `${sent.length} invitation${sent.length > 1 ? 's' : ''} sent` : 'Just you for now — invite people any time'}
                    </h2>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                        {sent.map((p) => (
                            <li key={p.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg2)', border: 'var(--line) solid var(--border)', color: 'var(--fg2)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
                                    {p.email.charAt(0).toUpperCase()}
                                </span>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</span>
                                <span style={{ fontSize: 13, color: 'var(--fg3)', fontWeight: 600 }}>{SENT_ROLE_LABELS[p.role]}</span>
                                <span style={setupPill('var(--amber-ink)', 'var(--note2)')}>Pending</span>
                            </li>
                        ))}
                        <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
                            <Avatar initials={initialsOf(me?.name ?? '')} color="#c96b8f" size={30} title={me?.name} />
                            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600 }}>
                                {me?.name} <span style={{ color: 'var(--fg3)', fontWeight: 500 }}>(you)</span>
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--fg3)', fontWeight: 600 }}>Owner</span>
                            <span style={setupPill('var(--green-ink)', 'var(--sup2)')}>Active</span>
                        </li>
                    </ul>
                </div>

                {canWorkHelpdesk(me) && (
                    <>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', margin: '38px 0 12px' }}>Next, when you have five minutes</h2>
                        <Link
                            to="/support/kb"
                            className="setup-next"
                            style={{ display: 'flex', alignItems: 'center', gap: 14, borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--panel)', borderRadius: 18, padding: '15px 18px', color: 'var(--fg)', textDecoration: 'none' }}
                        >
                            <span aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>❏</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>Write your first help article</span>
                                <span style={{ display: 'block', fontSize: 13.5, color: 'var(--fg2)' }}>Deflect tickets before they reach the queue.</span>
                            </span>
                            <span aria-hidden="true" style={{ color: 'var(--fg3)', fontSize: 18 }}>→</span>
                        </Link>
                    </>
                )}
                </QueryState>
            </SetupFrame>
        );
    }

    return (
        <SetupFrame
            {...frame}
            footer={{
                note: 'Invites expire after 3 days.',
                skip: { label: 'Skip for now', onClick: () => setStep(3), disabled: sending },
                // With addresses typed, the button only ever sends them: an owner who has not confirmed their email
                // yet cannot, so it waits (Skip moves on) rather than dropping what they typed.
                primary: valid.length
                    ? { label: sending ? 'Sending…' : `Send ${valid.length} invite${valid.length > 1 ? 's' : ''} →`, onClick: send, disabled: sending || !verified }
                    : { label: 'Continue →', onClick: () => setStep(3) },
            }}
        >
            <h1 style={setupTitle}><span className="hl">Invite your teammates</span></h1>
            <p style={{ ...setupLead, marginBottom: 30 }}>Prizy works best when support and engineering are both in it. You can always invite more later.</p>

            {me && !verified && (
                <div role="note" style={{ ...setupCard, marginBottom: 20 }}>
                    <div style={setupCardTitle}>Confirm your email first</div>
                    <div style={{ fontSize: 13.5, color: 'var(--fg2)', marginBottom: 12 }}>
                        Invitations go out once you’ve opened the link we sent to {me.email}.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <Button size="sm" onClick={() => { void queryClient.invalidateQueries({ queryKey: ['me'] }); }}>I’ve confirmed it</Button>
                        <Button variant="secondary" size="sm" onClick={resendLink} disabled={resend === 'sending'}>Send the link again</Button>
                        <span role="status" style={{ fontSize: 13.5, fontWeight: 600, color: resend === 'failed' ? 'var(--red-ink)' : 'var(--green-ink)' }}>
                            {resend === 'sent' ? 'Sent. Check your inbox.' : resend === 'failed' ? "Couldn't send it. Try again." : ''}
                        </span>
                    </div>
                </div>
            )}

            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', margin: 0, padding: 0 }}>
                {rows.map((r, i) => {
                    const bad = r.email.trim().length > 0 && !validEmail(r.email);
                    return (
                        <li key={r.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    ref={(el) => { if (el) inputs.current.set(r.id, el); else inputs.current.delete(r.id); }}
                                    type="email"
                                    value={r.email}
                                    onChange={(e) => setRow(r.id, { email: e.target.value, error: undefined })}
                                    onKeyDown={(e) => onRowKey(e, r.id)}
                                    placeholder="name@company.com"
                                    aria-label={`Email address ${i + 1}`}
                                    aria-invalid={bad || !!r.error || undefined}
                                    className="login-input"
                                    style={{ ...setupInput, flex: 1, minWidth: 0, height: 46, fontSize: 15, ...(bad || r.error ? { borderColor: 'var(--red)' } : {}) }}
                                />
                                <select
                                    value={r.role}
                                    onChange={(e) => setRow(r.id, { role: e.target.value as Role })}
                                    aria-label={`Role for email address ${i + 1}`}
                                    className="login-input"
                                    style={{ height: 46, borderRadius: 'var(--radius-pill)', borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--panel)', color: 'var(--fg)', fontSize: 14, fontWeight: 600, padding: '0 14px', cursor: 'pointer', flexShrink: 0, width: 180, fontFamily: 'inherit' }}
                                >
                                    {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeRow(r.id)}
                                    aria-label={`Remove email address ${i + 1}`}
                                    title="Remove"
                                    className="bg-transparent text-fg3 hover:bg-hover hover:text-fg"
                                    style={{ width: 38, height: 38, flexShrink: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}
                                >
                                    ✕
                                </button>
                            </div>
                            {r.error && <p role="alert" style={{ ...setupError, marginTop: 6 }}>{r.error}</p>}
                        </li>
                    );
                })}
            </ul>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={addRow}
                    className="border-border2 bg-transparent hover:border-fg hover:bg-panel"
                    style={{ borderWidth: 'var(--line)', borderStyle: 'dashed', color: 'var(--fg)', padding: '8px 16px', borderRadius: 'var(--radius-pill)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    + Add another
                </button>
                <span aria-live="polite" style={{ fontSize: 13.5, fontWeight: 600, color: valid.length ? 'var(--green-ink)' : 'var(--fg3)' }}>
                    {valid.length ? `${valid.length} address${valid.length > 1 ? 'es' : ''} ready` : 'Add at least one to send invites'}
                </span>
            </div>

            <div style={{ ...setupCard, marginTop: 28 }}>
                <label htmlFor="setup-bulk" style={{ ...setupCardTitle, display: 'block' }}>Paste a list instead</label>
                <div id="setup-bulk-hint" style={{ fontSize: 13.5, color: 'var(--fg2)', marginBottom: 12 }}>Separate addresses with commas, spaces or line breaks.</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <textarea
                        id="setup-bulk"
                        value={bulk}
                        onChange={(e) => setBulk(e.target.value)}
                        placeholder="maya@northwind.com, devin@northwind.com"
                        aria-describedby="setup-bulk-hint"
                        className="login-input"
                        style={{ flex: 1, minWidth: 0, minHeight: 68, resize: 'vertical', borderRadius: 14, borderWidth: 'var(--line)', borderStyle: 'solid', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14.5, padding: '10px 14px', lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <Button onClick={addBulk} style={{ height: 42, padding: '0 18px', flexShrink: 0 }}>Add</Button>
                </div>
            </div>
        </SetupFrame>
    );
}
