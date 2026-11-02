import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { AuthFrame } from './AuthChrome';
import { AUTH_LINK_CLASSES, authError, authInput, authLabel, authLead, authTitle } from './authStyles';
import { sessionPost } from './useAuth';

interface Invitation {
    email: string;
    workspace_name: string;
    inviter_name: string | null;
}

async function fetchInvitation(token: string): Promise<Invitation> {
    const res = await fetch(`/invitations/${encodeURIComponent(token)}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, 'Error', 'Request failed.', json?.errors);
    return json as Invitation;
}

/** The server's reason for refusing the token, when that is what went wrong. */
function refusal(err: unknown): string | undefined {
    return err instanceof ApiError ? err.errors?.token?.[0] : undefined;
}

/**
 * Where the link in an invitation email lands. The invitee has no account or
 * session yet: they choose a name and password here, and accepting signs them
 * in. Someone removed earlier comes back through the same form.
 */
export default function AcceptInvitePage() {
    const { token = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const invitation = useQuery({
        queryKey: ['invitation', token],
        queryFn: () => fetchInvitation(token),
        retry: false,
        staleTime: Infinity,
    });
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (submitting) return;
        setErrors({});
        setFormError(null);
        setSubmitting(true);
        try {
            await sessionPost(`/invitations/${encodeURIComponent(token)}/accept`, { name, password });
            // The browser may have held someone else's session: nothing cached is theirs.
            queryClient.clear();
            navigate('/');
        } catch (err) {
            const reason = refusal(err);
            if (reason) setFormError(reason);
            else if (err instanceof ApiError && err.errors) setErrors(err.errors);
            else if (err instanceof ApiError && err.status === 429) setFormError('Too many attempts. Try again in a minute.');
            else setFormError("Couldn't join the workspace. Try again.");
            setSubmitting(false);
        }
    }

    if (invitation.isPending) {
        return (
            <AuthFrame>
                <p role="status" style={authLead}>Opening your invitation…</p>
            </AuthFrame>
        );
    }

    if (invitation.isError) {
        return (
            <AuthFrame>
                <h1 style={authTitle}><span className="hl">This invitation can't be used</span></h1>
                <p role="alert" style={{ ...authLead, margin: '14px 0 0' }}>
                    {refusal(invitation.error) ?? "Couldn't open this invitation. Try again."}
                </p>
                <p style={{ margin: '28px 0 0', color: 'var(--fg2)', fontSize: 15 }}>
                    Ask whoever invited you to send a new one, or <Link to="/login" className={AUTH_LINK_CLASSES} style={{ fontWeight: 700 }}>sign in</Link> if you already have an account.
                </p>
            </AuthFrame>
        );
    }

    const { email, workspace_name: workspaceName, inviter_name: inviterName } = invitation.data;

    return (
        <AuthFrame>
            <h1 style={{ ...authTitle, overflowWrap: 'anywhere' }}><span className="hl">Join {workspaceName}</span></h1>
            <p style={{ ...authLead, overflowWrap: 'anywhere' }}>
                {inviterName ? `${inviterName} invited you to this workspace on Prizy.` : 'You have been invited to this workspace on Prizy.'}
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={authLabel}>Work email
                    <input className="login-input" type="email" value={email} readOnly autoComplete="username" style={{ ...authInput, color: 'var(--fg2)' }} />
                </label>
                <label style={authLabel}>Your name
                    <input className="login-input" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required style={authInput} />
                </label>
                {errors.name?.map((m) => <p key={m} role="alert" style={authError}>{m}</p>)}
                <label style={authLabel}>Password
                    <input className="login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required style={authInput} />
                </label>
                {errors.password?.map((m) => <p key={m} role="alert" style={authError}>{m}</p>)}
                {formError && <p role="alert" style={authError}>{formError}</p>}
                <Button type="submit" disabled={submitting} style={{ width: '100%', height: 50, fontSize: 16, marginTop: 6 }}>
                    {submitting ? 'Joining…' : 'Join workspace →'}
                </Button>
            </form>
        </AuthFrame>
    );
}
