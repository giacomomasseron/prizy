import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { useLogin } from './useAuth';

const ROWS = [
    { id: 'ENG-482', title: 'Webhook retries drop payload on 429', status: 'In progress', color: 'var(--amber)' },
    { id: 'SUP-119', title: 'Enterprise SSO loop after password reset', status: 'Escalated', color: 'var(--red)' },
    { id: 'ENG-467', title: 'Cycle burndown miscounts carryover', status: 'In review', color: 'var(--blue)' },
    { id: 'SUP-131', title: 'Attachment preview fails on Safari 17', status: 'Resolved', color: 'var(--green)' },
];

const labelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--fg2)' };
const inputStyle: CSSProperties = { height: 42, borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--fg)', fontSize: 15, padding: '0 13px' };
const errStyle: CSSProperties = { margin: 0, fontSize: 13.5, color: 'var(--red)' };

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
            navigate('/');
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(err.errors ?? {});
                setMessage(err.detail);
            }
        }
    }

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', color: 'var(--fg)', background: 'var(--bg)' }}>
            {/* Left: form */}
            <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 40, overflowY: 'auto' }}>
                <div className="login-fade" style={{ width: '100%', maxWidth: 372 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 38 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--accent),#3aa76d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#fff', boxShadow: '0 4px 14px var(--accent2)' }}>P</div>
                        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.03em' }}>Prizy</span>
                    </div>

                    <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 7px' }}>Welcome back</h1>
                    <p style={{ margin: '0 0 30px', color: 'var(--fg2)', fontSize: 14.5 }}>Sign in to your workspace to keep things moving.</p>

                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        <label style={labelStyle}>Work email
                            <input className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" style={inputStyle} />
                        </label>
                        {errors.email?.map((m) => <p key={m} role="alert" style={errStyle}>{m}</p>)}
                        <label style={labelStyle}>Password
                            <input className="login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" autoComplete="current-password" style={inputStyle} />
                        </label>
                        {errors.password?.map((m) => <p key={m} role="alert" style={errStyle}>{m}</p>)}
                        {message && <p role="alert" style={errStyle}>{message}</p>}
                        <button type="submit" disabled={login.isPending} className="login-submit" style={{ height: 44, borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,var(--accent),#8a76ff)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4, boxShadow: '0 6px 18px var(--accent2)', opacity: login.isPending ? 0.6 : 1 }}>
                            {login.isPending ? 'Signing in…' : 'Sign in →'}
                        </button>
                    </form>

                    <p style={{ margin: '26px 0 0', textAlign: 'center', color: 'var(--fg2)', fontSize: 14 }}>New to Prizy? <Link to="/signup" style={{ color: 'var(--accent)' }}>Create a workspace</Link></p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'center', color: 'var(--fg3)', fontSize: 12 }}>
                    © 2026 Prizy · <a href="https://prizy.dev/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Privacy</a>
                    {' · '}<a href="https://prizy.dev/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Terms</a>
                </div>
            </section>

            {/* Right: decorative (hidden below 900px via .login-aside) */}
            <aside className="login-aside" aria-hidden="true" style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', background: 'radial-gradient(120% 120% at 80% 10%,#1a1730 0%,#0d0d14 55%,#08080b 100%)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 64 }}>
                <div className="login-grid" style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)', backgroundSize: '44px 44px', opacity: 0.25 }} />
                <div className="login-orb1" style={{ position: 'absolute', top: -90, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(109,105,242,.5),transparent 68%)', filter: 'blur(20px)' }} />
                <div className="login-orb2" style={{ position: 'absolute', bottom: -120, left: -40, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(91,141,239,.4),transparent 68%)', filter: 'blur(20px)' }} />
                <div className="login-fade" style={{ position: 'relative', maxWidth: 440 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 20, border: '1px solid var(--border2)', background: 'rgba(255,255,255,.03)', fontSize: 12, fontWeight: 500, color: 'var(--fg2)', marginBottom: 26, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />All systems operational
                    </div>
                    <h2 style={{ fontSize: 35, fontWeight: 600, letterSpacing: '-.025em', lineHeight: 1.2, margin: '0 0 16px' }}>Where support tickets and engineering issues finally live together.</h2>
                    <p style={{ fontSize: 16, color: 'var(--fg2)', lineHeight: 1.6, margin: '0 0 34px' }}>Prizy connects your inbox to your backlog — every escalation traceable from first reply to shipped fix.</p>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 13, background: 'rgba(21,21,25,.72)', backdropFilter: 'blur(8px)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 15px', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--red)' }} />
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--amber)' }} />
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--green)' }} />
                            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>escalations · live</span>
                        </div>
                        {ROWS.map((r, i) => (
                            <div key={r.id} className="login-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px', borderBottom: '1px solid var(--border)', animationDelay: `${i * 0.5}s` }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg3)', width: 52 }}>{r.id}</span>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: r.color, boxShadow: `0 0 7px ${r.color}` }} />
                                <span style={{ flex: 1, fontSize: 13.8, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                                <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: r.color, background: `color-mix(in srgb, ${r.color} 16%, transparent)` }}>{r.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
}
