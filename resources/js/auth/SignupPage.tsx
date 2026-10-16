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

type SignedUp = { activation_required: boolean; workspace_url: string };

const addressStyle = { fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--fg)' };

export default function SignupPage() {
    const [form, setForm] = useState({ workspace_name: '', slug: '', name: '', email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    // An error no field owns: a throttled network, or a server failure.
    const [formError, setFormError] = useState<string | null>(null);
    const [done, setDone] = useState<SignedUp | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function set(k: keyof typeof form) {
        // The slug becomes a hostname, which the server matches lowercased.
        return (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm({ ...form, [k]: k === 'slug' ? e.target.value.toLowerCase() : e.target.value });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        setErrors({});
        setFormError(null);
        setSubmitting(true);
        try {
            setDone(await sessionPost<SignedUp>('/workspaces', form));
        } catch (err) {
            if (err instanceof ApiError && err.errors) setErrors(err.errors);
            else if (err instanceof ApiError && err.status === 429) setFormError('Too many sign-ups from this network. Try again later.');
            else setFormError("Couldn't create the workspace. Try again.");
            setSubmitting(false);
        }
    }

    if (done) {
        const address = new URL(done.workspace_url).host;
        return (
            <AuthFrame>
                {/* role="status": the focused Create button unmounts here, so announce the result. */}
                {done.activation_required ? (
                    <div role="status">
                        <h1 style={authTitle}><span className="hl">Check your email</span></h1>
                        <p style={{ ...authLead, margin: '14px 0 0' }}>
                            Open the link we sent to {form.email} within 24 hours to activate <code style={addressStyle}>{address}</code>.
                        </p>
                    </div>
                ) : (
                    <div role="status">
                        <h1 style={authTitle}><span className="hl">Workspace created</span></h1>
                        <p style={{ ...authLead, margin: '14px 0 0' }}>
                            Visit <a href={done.workspace_url} style={{ color: 'var(--fg)' }}><code style={addressStyle}>{address}</code></a> to log in.
                        </p>
                    </div>
                )}
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
                {formError && <p role="alert" style={authError}>{formError}</p>}
                <Button type="submit" disabled={submitting} style={{ width: '100%', height: 50, fontSize: 16, marginTop: 6 }}>Create</Button>
            </form>
        </AuthFrame>
    );
}
