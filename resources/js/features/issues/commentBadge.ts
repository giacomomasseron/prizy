import type { CSSProperties } from 'react';

export type CommentBadgeVariant = 'assignee' | 'support';

export function commentBadge(
    userId: string,
    assigneeId: string | null | undefined,
    isAgent: boolean | undefined,
): CommentBadgeVariant | null {
    if (userId === assigneeId) return 'assignee';
    if (isAgent) return 'support';
    return null;
}

export const badgeCss = (variant: CommentBadgeVariant): CSSProperties => ({
    fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, letterSpacing: '.02em',
    color: variant === 'support' ? 'var(--green)' : 'var(--fg2)',
    background: variant === 'support' ? 'rgba(75,171,102,.14)' : 'var(--hover)',
});

export const badgeLabel = (variant: CommentBadgeVariant): string =>
    variant === 'support' ? 'Support' : 'Assignee';
