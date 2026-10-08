import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { AuthBrand, AuthFooter } from './AuthChrome';
import { authError, authInput, authLabel, authLead, authTitle } from './authStyles';
import { sessionPost } from './useAuth';

/** The v2 auth frame (same left column as LoginPage, no decorative panel). */
function AuthFrame({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', padding: '28px 40px 24px', boxSizing: 'border-box', color: 'var(--fg)', background: 'var(--bg)' }}>
            <AuthBrand />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <div className="login-fade" style={{ width: '100%', maxWidth: 400 }}>{children}</div>
            </div>
            <AuthFooter />
        </div>
    );
}

export default function SignupPage() {
    const [form, setForm] = useState({ workspace_name: '', slug: '', name: '', email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [done, setDone] = useState(false);

    function set(k: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrors({});
        try {
            await sessionPost('/workspaces', form);
            setDone(true);
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.errors ?? {});
        }
    }

    if (done) {
        return (
            <AuthFrame>
                <h1 style={authTitle}><span className="hl">Workspace created</span></h1>
                <p style={{ ...authLead, margin: '14px 0 0' }}>
                    Visit <code style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--fg)' }}>{form.slug}</code>.localhost to log in.
                </p>
            </AuthFrame>
        );
    }

    return (
        <AuthFrame>
            <h1 style={{ ...authTitle, marginBottom: 28 }}><span className="hl">Create a workspace</span></h1>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(['workspace_name', 'slug', 'name', 'email', 'password'] as const).map((field) => (
                    <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <label htmlFor={field} style={{ ...authLabel, textTransform: 'capitalize' }}>{field.replace('_', ' ')}</label>
                        <input
                            id={field}
                            type={field === 'password' ? 'password' : 'text'}
                            value={form[field]}
                            onChange={set(field)}
                            className="login-input"
                            style={authInput}
                        />
                        {errors[field]?.map((m) => <p key={m} role="alert" style={authError}>{m}</p>)}
                    </div>
                ))}
                <Button type="submit" style={{ width: '100%', height: 50, fontSize: 16, marginTop: 6 }}>Create</Button>
            </form>
        </AuthFrame>
    );
}
