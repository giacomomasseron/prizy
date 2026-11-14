import type { MouseEvent } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useIssueDrawers } from './useIssueDrawers';

/**
 * A link to an issue that opens it in the drawer, on the page you are on. It is still a real link to the issue's own
 * page, so a new tab or window (a modified or middle click) opens that.
 */
export function PeekLink({ issueId, onClick, children, ...rest }: { issueId: string } & Omit<LinkProps, 'to'>) {
    const { openPeek } = useIssueDrawers();
    function open(e: MouseEvent<HTMLAnchorElement>) {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openPeek(issueId);
    }
    return <Link to={`/issues/${issueId}`} onClick={open} {...rest}>{children}</Link>;
}
