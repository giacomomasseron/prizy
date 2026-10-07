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
    fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-pill)', letterSpacing: '.02em',
    color: variant === 'support' ? 'var(--green)' : 'var(--fg2)',
    background: variant === 'support' ? 'var(--sup2)' : 'var(--hover)',
});

export const badgeLabel = (variant: CommentBadgeVariant): string =>
    variant === 'support' ? 'Support' : 'Assignee';
