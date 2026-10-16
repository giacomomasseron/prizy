import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { AuthFrame } from './AuthChrome';
import { AUTH_LINK_CLASSES, authError, authInput, authLabel, authLead, authTitle } from './authStyles';
import { sessionPost } from './useAuth';

/**
 * "Find your workspace", on the sign-up host. Login lives on each workspace's
 * own host, so someone who forgot theirs gets the links by email. The answer
 * is the same whether or not the address has any.
 */
export default function FindWorkspacePage() {
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting) return;
        setErrors({});
        setFormError(null);
        setSubmitting(true);
        try {
            await sessionPost('/find-workspaces', { email });
            setSent(true);
        } catch (err) {
            if (err instanceof ApiError && err.errors) setErrors(err.errors);
            else if (err instanceof ApiError && err.status === 429) setFormError('Too many requests from this network. Try again later.');
            else setFormError("Couldn't send the email. Try again.");
            setSubmitting(false);
        }
    }

    if (sent) {
        return (
            <AuthFrame>
                {/* role="status": the focused button unmounts here, so announce the result. */}
                <div role="status">
                    <h1 style={authTitle}><span className="hl">Check your email</span></h1>
                    <p style={{ ...authLead, margin: '14px 0 0' }}>
                        If {email} belongs to any workspace, we've sent you a link to each.
                    </p>
                </div>
            </AuthFrame>
        );
    }

    return (
        <AuthFrame>
            <h1 style={authTitle}><span className="hl">Find your workspace</span></h1>
            <p style={authLead}>We'll email you a link to every workspace your address belongs to.</p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={authLabel}>Work email
                    <input className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" style={authInput} />
                </label>
                {errors.email?.map((m) => <p key={m} role="alert" style={authError}>{m}</p>)}
                {formError && <p role="alert" style={authError}>{formError}</p>}
                <Button type="submit" disabled={submitting} style={{ width: '100%', height: 50, fontSize: 16, marginTop: 6 }}>Email me my workspaces</Button>
            </form>
            <p style={{ margin: '28px 0 0', textAlign: 'center', color: 'var(--fg2)', fontSize: 15 }}>
                New to Prizy? <a href="/signup" className={AUTH_LINK_CLASSES} style={{ fontWeight: 700 }}>Create a workspace</a>
            </p>
        </AuthFrame>
    );
}
