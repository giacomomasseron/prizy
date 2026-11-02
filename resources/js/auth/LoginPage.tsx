import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { AuthColumn } from './AuthChrome';
import { AUTH_LINK_CLASSES, authColumn, authError, authInput, authLabel, authLead, authTitle } from './authStyles';
import { signupUrl } from './signupUrl';
import { useLogin } from './useAuth';
import { ink } from '../lib/ink';

const ROWS = [
    { id: 'ENG-482', title: 'Webhook retries drop payload on 429', status: 'In progress', tone: 'var(--amber)' },
    { id: 'SUP-119', title: 'Enterprise SSO loop after password reset', status: 'Escalated', tone: 'var(--red)' },
    { id: 'ENG-467', title: 'Cycle burndown miscounts carryover', status: 'In review', tone: 'var(--blue)' },
    { id: 'SUP-131', title: 'Attachment preview fails on Safari 17', status: 'Resolved', tone: 'var(--green)' },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const login = useLogin();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [message, setMessage] = useState<string | null>(null);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setErrors({});
        setMessage(null);
        try {
            await login.mutateAsync({ email, password });
            // Home: Today for tracker users; the route's guard sends everyone else to theirs (homePathFor).
            navigate('/today');
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors ?? {});
                setMessage(err.detail);
            }
        }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            {/* Left: brand, form, footer */}
            <section style={{ ...authColumn, flex: 1, minWidth: 0, overflowY: 'auto' }}>
                <AuthColumn>
                    <h1 style={authTitle}><span className="hl">Welcome back</span></h1>
                    <p style={authLead}>Sign in to your workspace to keep things moving.</p>

                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label style={authLabel}>Work email
                            <input className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" style={authInput} />
                        </label>
                        {errors.email?.map((m) => <p key={m} role="alert" style={authError}>{m}</p>)}
                        <label style={authLabel}>Password
                            <input className="login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" autoComplete="current-password" style={authInput} />
                        </label>
                        {errors.password?.map((m) => <p key={m} role="alert" style={authError}>{m}</p>)}
                        {message && <p role="alert" style={authError}>{message}</p>}
                        <Button type="submit" disabled={login.isPending} style={{ width: '100%', height: 50, fontSize: 16, marginTop: 6 }}>
                            {login.isPending ? 'Signing in…' : 'Sign in →'}
                        </Button>
                    </form>

                    <p style={{ margin: '28px 0 0', textAlign: 'center', color: 'var(--fg2)', fontSize: 15 }}>
                        {/* Sign-up lives on its own host (signup.prizy.dev), not this workspace's. */}
                        New to Prizy? <a href={signupUrl('/')} className={AUTH_LINK_CLASSES} style={{ fontWeight: 700 }}>Create a workspace</a>
                    </p>
                </AuthColumn>
            </section>

            {/* Right: decorative (hidden below 900px via .login-aside). It never scrolls — a scroll box would be a keyboard
                stop inside aria-hidden — and margin:auto centres it while there is room, so overflow clips the bottom, never the top. */}
            <aside className="login-aside" aria-hidden="true" style={{ flex: 1, minWidth: 0, background: 'var(--bg2)', borderLeft: 'var(--line) solid var(--border)', display: 'flex', flexDirection: 'column', padding: 56, overflow: 'hidden' }}>
                <div className="login-fade" style={{ maxWidth: 500, width: '100%', margin: 'auto' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--panel)', border: 'var(--line) solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--fg2)', marginBottom: 26 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />All systems operational
                    </div>
                    <h2 style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1.06, textWrap: 'balance' }}>Where support tickets and engineering issues finally live together.</h2>
                    <p style={{ margin: '0 0 34px', fontSize: 17, color: 'var(--fg2)', lineHeight: 1.6 }}>Prizy connects your inbox to your backlog — every escalation traceable from first reply to shipped fix.</p>
                    <div style={{ border: 'var(--line) solid var(--fg)', borderRadius: 22, background: 'var(--panel)', overflow: 'hidden', boxShadow: '6px 6px 0 var(--fg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: 'var(--line) solid var(--border)' }}>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>Escalations</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--fg3)' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)' }} />live
                            </span>
                        </div>
                        {ROWS.map((r) => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', marginBottom: -1 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)', width: 58, flexShrink: 0 }}>{r.id}</span>
                                <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 11px', borderRadius: 'var(--radius-pill)', color: ink(r.tone), background: `color-mix(in srgb, ${r.tone} 13%, transparent)`, whiteSpace: 'nowrap', flexShrink: 0 }}>{r.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
}
