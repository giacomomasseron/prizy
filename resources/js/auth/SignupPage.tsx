import { useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError } from '../lib/apiClient';
import { SETUP_GUIDE_URL, SetupFrame } from '../features/setup/SetupFrame';
import { DEFAULT_MARK_COLOR, MARK_COLORS, WorkspaceMark } from '../features/setup/WorkspaceMark';
import { baseDomain, slugify, slugifyTyped, useSlugStatus, type SlugStatus } from '../features/setup/slug';
import {
    SETUP_LINK_CLASSES, pickCard, setupError, setupGroupLabel, setupInput, setupLabel, setupLead, setupPill, setupTitle,
} from '../features/setup/setupStyles';
import { sessionPost } from './useAuth';

/** login_url: a one-time link that logs the owner in on their workspace's own host (null while it awaits activation). */
type SignedUp = { activation_required: boolean; workspace_url: string; login_url: string | null };

type Usage = 'both' | 'engineering' | 'support';

const USAGES: { key: Usage; icon: string; label: string; sub: string }[] = [
    { key: 'both', icon: '⇄', label: 'Both', sub: 'Support bridge on' },
    { key: 'engineering', icon: '⌗', label: 'Engineering', sub: 'Issues, cycles, roadmap' },
    { key: 'support', icon: '✉', label: 'Support', sub: 'Ticket queue, help center' },
];

const RED_TINT = 'color-mix(in srgb, var(--red) 11%, transparent)';

/** What the URL field says about its slug: a pill inside the field, and a line under it. */
function slugNote(status: SlugStatus, slug: string, base: string): { pill: string | null; note: string; ink: string; tint: string } {
    const host = base ? `${slug}.${base}` : slug;
    switch (status.kind) {
        case 'short': return { pill: 'too short', note: 'Workspace URLs need at least three characters.', ink: 'var(--amber-ink)', tint: 'var(--note2)' };
        case 'checking': return { pill: null, note: `Checking ${host}…`, ink: 'var(--fg3)', tint: 'transparent' };
        case 'available': return { pill: 'available', note: `Everyone reaches your workspace at ${host}.`, ink: 'var(--green-ink)', tint: 'var(--sup2)' };
        case 'taken': return { pill: 'taken', note: `That URL belongs to another workspace. ${slug.length <= 60 ? `Try ${slug}-hq.` : 'Try another.'}`, ink: 'var(--red-ink)', tint: RED_TINT };
        case 'reserved': return { pill: 'reserved', note: status.message, ink: 'var(--red-ink)', tint: RED_TINT };
        case 'invalid': return { pill: 'invalid', note: status.message, ink: 'var(--red-ink)', tint: RED_TINT };
        default: return { pill: null, note: 'Lowercase letters, numbers and dashes.', ink: 'var(--fg3)', tint: 'transparent' };
    }
}

const addressStyle: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--fg)' };

function FieldErrors({ messages }: { messages?: string[] }) {
    return <>{messages?.map((m) => <p key={m} role="alert" style={{ ...setupError, marginTop: 8 }}>{m}</p>)}</>;
}

/**
 * Sign-up, on the sign-up host: step 1 of the Setup v2 wizard. It creates the workspace and its owner; the owner then
 * finishes setting it up (invites, ready) on the workspace's own host, at /setup, where the login link lands.
 */
export default function SignupPage() {
    const [workspaceName, setWorkspaceName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [color, setColor] = useState(DEFAULT_MARK_COLOR);
    const [usage, setUsage] = useState<Usage>('both');
    const [account, setAccount] = useState({ name: '', email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    // An error no field owns: a throttled network, or a server failure.
    const [formError, setFormError] = useState<string | null>(null);
    const [done, setDone] = useState<SignedUp | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const base = baseDomain();
    const status = useSlugStatus(slug);
    const note = slugNote(status, slug, base);
    const canContinue = workspaceName.trim().length > 1 && (status.kind === 'available' || status.kind === 'unknown');

    function onName(value: string) {
        setWorkspaceName(value);
        if (!slugEdited) setSlug(slugify(value));
    }

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (submitting || !canContinue) return;
        setErrors({});
        setFormError(null);
        setSubmitting(true);
        try {
            const result = await sessionPost<SignedUp>('/workspaces', {
                workspace_name: workspaceName, slug, color, usage, ...account,
            });
            setDone(result);
            // The workspace lives on its own host; this host's session is no use there.
            if (result.login_url) window.location.assign(result.login_url);
        } catch (err) {
            if (err instanceof ApiError && err.errors) setErrors(err.errors);
            else if (err instanceof ApiError && err.status === 429) setFormError('Too many sign-ups from this network. Try again later.');
            else setFormError("Couldn't create the workspace. Try again.");
            setSubmitting(false);
        }
    }

    const railLinks = (
        <>
            <a href={SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className={SETUP_LINK_CLASSES}>Setup guide ↗</a>
            <a href="/find" className={SETUP_LINK_CLASSES}>Find your workspace</a>
        </>
    );

    if (done) {
        const address = new URL(done.workspace_url).host;
        return (
            <SetupFrame step={2} done={[1]} railLinks={railLinks} footer={{}}>
                {/* role="status": the focused Continue button unmounts here, so announce the result. */}
                {done.activation_required ? (
                    <div role="status">
                        <h1 style={setupTitle}><span className="hl">Check your email</span></h1>
                        <p style={{ ...setupLead, margin: 0 }}>
                            Open the link we sent to {account.email} within 24 hours to activate <code style={addressStyle}>{address}</code>. Then you can invite your team.
                        </p>
                    </div>
                ) : (
                    <div role="status">
                        <h1 style={setupTitle}><span className="hl">Workspace created</span></h1>
                        <p style={{ ...setupLead, margin: 0 }}>
                            Taking you to <a href={done.login_url ?? done.workspace_url} style={{ color: 'var(--fg)' }}><code style={addressStyle}>{address}</code></a>…
                        </p>
                    </div>
                )}
            </SetupFrame>
        );
    }

    return (
        <SetupFrame
            step={1}
            done={[]}
            railLinks={railLinks}
            onSubmit={submit}
            footer={{
                note: 'The URL can’t be changed once the workspace is created.',
                primary: { label: submitting ? 'Creating…' : 'Continue →', disabled: !canContinue || submitting },
            }}
        >
            <h1 style={setupTitle}><span className="hl">Create your workspace</span></h1>
            <p style={setupLead}>One workspace holds your issues, your support inbox and everyone who works on them.</p>

            <div style={{ marginBottom: 22 }}>
                <label style={setupLabel}>
                    Workspace name
                    <input
                        value={workspaceName}
                        onChange={(e) => onName(e.target.value)}
                        placeholder="Northwind Traders"
                        autoComplete="organization"
                        className="login-input"
                        style={setupInput}
                    />
                </label>
                <FieldErrors messages={errors.workspace_name} />
            </div>

            <div style={setupLabel}>
                <label htmlFor="signup-slug">Workspace URL</label>
                <div className="setup-field" style={{ display: 'flex', alignItems: 'center', height: 50, borderRadius: 14, background: 'var(--panel)', overflow: 'hidden', boxSizing: 'border-box' }}>
                    <input
                        id="signup-slug"
                        value={slug}
                        onChange={(e) => { setSlug(slugifyTyped(e.target.value)); setSlugEdited(true); }}
                        placeholder={base ? `northwind.${base}` : 'northwind'}
                        autoComplete="off"
                        spellCheck={false}
                        aria-describedby="signup-slug-note"
                        style={{ flex: 1, minWidth: 0, height: '100%', border: 'none', background: 'none', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '0 6px 0 16px' }}
                    />
                    {note.pill && <span style={{ ...setupPill(note.ink, note.tint), marginRight: 8 }}>{note.pill}</span>}
                </div>
            </div>
            {/* A verdict is announced; the "Checking…" between keystrokes is not. */}
            <div id="signup-slug-note" aria-live="polite" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8, color: note.ink }}>
                {status.kind === 'checking' ? <span aria-hidden="true">{note.note}</span> : note.note}
            </div>
            <FieldErrors messages={errors.slug} />

            <div id="signup-mark" style={{ ...setupGroupLabel, marginTop: 28 }}>Workspace mark</div>
            <div role="group" aria-labelledby="signup-mark" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <WorkspaceMark name={workspaceName} color={color} />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {MARK_COLORS.map((c) => (
                        <button
                            key={c.hex}
                            type="button"
                            onClick={() => setColor(c.hex)}
                            aria-pressed={color === c.hex}
                            aria-label={c.name}
                            title={c.name}
                            style={{
                                width: 30, height: 30, borderRadius: '50%', background: c.hex, cursor: 'pointer', padding: 0, boxSizing: 'border-box',
                                border: `2px solid ${color === c.hex ? 'var(--fg)' : 'var(--panel)'}`,
                                boxShadow: `0 0 0 1.5px ${color === c.hex ? 'var(--fg)' : 'var(--border)'}`,
                            }}
                        />
                    ))}
                </div>
            </div>
            <FieldErrors messages={errors.color} />

            <div id="signup-usage" style={setupGroupLabel}>What will this workspace run?</div>
            <div role="group" aria-labelledby="signup-usage" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {USAGES.map((u) => (
                    <button
                        key={u.key}
                        type="button"
                        onClick={() => setUsage(u.key)}
                        aria-pressed={usage === u.key}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 7, padding: 16, borderRadius: 18, ...pickCard(usage === u.key) }}
                    >
                        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>{u.icon}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, letterSpacing: '-.02em' }}>{u.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg2)', lineHeight: 1.4 }}>{u.sub}</span>
                    </button>
                ))}
            </div>
            <FieldErrors messages={errors.usage} />

            <div style={setupGroupLabel}>Your account</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {([
                    ['name', 'Your name', 'text', 'name', 'Maya Patel'],
                    ['email', 'Work email', 'email', 'email', 'maya@northwind.com'],
                    ['password', 'Password', 'password', 'new-password', ''],
                ] as const).map(([field, label, type, autoComplete, placeholder]) => (
                    <div key={field}>
                        <label style={setupLabel}>
                            {label}
                            <input
                                type={type}
                                value={account[field]}
                                onChange={(e) => setAccount({ ...account, [field]: e.target.value })}
                                autoComplete={autoComplete}
                                placeholder={placeholder || undefined}
                                className="login-input"
                                style={setupInput}
                            />
                        </label>
                        <FieldErrors messages={errors[field]} />
                    </div>
                ))}
            </div>
            {formError && <p role="alert" style={{ ...setupError, marginTop: 22 }}>{formError}</p>}
        </SetupFrame>
    );
}
