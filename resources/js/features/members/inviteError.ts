import { ApiError } from '../../lib/apiClient';

/** Why an invitation didn't go out, for whoever tried to send it. */
export function inviteError(err: unknown): string {
    if (err instanceof ApiError) {
        const first = err.errors && Object.values(err.errors)[0]?.[0];
        if (first) return first;
        if (err.status === 403) return 'Confirm your email address before sending invitations.';
        if (err.status === 429) return 'Too many invitations for now. Try again later.';
    }
    return "Couldn't send this invitation. Try again.";
}
