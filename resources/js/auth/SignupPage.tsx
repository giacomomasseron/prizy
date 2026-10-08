import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { AuthColumn } from './AuthChrome';
import { authColumn, authError, authInput, authLabel, authLead, authTitle } from './authStyles';
import { sessionPost } from './useAuth';

/** The v2 auth frame: the login page's left column on its own. */
function AuthFrame({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ ...authColumn, minHeight: '100vh', width: '100%', color: 'var(--fg)', background: 'var(--bg)' }}>
            <AuthColumn>{children}</AuthColumn>
        </div>
    );
}

const AUTOCOMPLETE = { workspace_name: 'organization', slug: 'off', name: 'name', email: 'email', password: 'new-password' } as const;

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
                {/* role="status": the focused Create button unmounts here, so announce the result. */}
                <div role="status">
                    <h1 style={authTitle}><span className="hl">Workspace created</span></h1>
                    <p style={{ ...authLead, margin: '14px 0 0' }}>
                        Visit <code style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--fg)' }}>{form.slug}</code>.localhost to log in.
                    </p>
                </div>
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
                            type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                            autoComplete={AUTOCOMPLETE[field]}
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
