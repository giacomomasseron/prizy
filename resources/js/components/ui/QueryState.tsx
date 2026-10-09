import type { CSSProperties, ReactNode } from 'react';
import { Button } from './Button';

/** The part of a react-query result QueryState reads (useQuery and useInfiniteQuery results both fit). */
export interface QueryLike {
    isLoading: boolean;
    isError: boolean;
    data?: unknown;
    refetch: () => unknown;
}

const loading: CSSProperties = { margin: 0, fontSize: 13, color: 'var(--fg3)' };
const failed: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, textAlign: 'center',
    color: 'var(--fg2)', fontSize: 14, fontWeight: 600, border: 'var(--line) dashed var(--border2)', borderRadius: 'var(--radius-card)',
};

/**
 * V2-G3c: a page's main query in one of three states — "Loading…" while it loads; "Couldn't load {what}." with a
 * Retry button when it fails with nothing to show; otherwise the page's own content, which keeps its own empty state
 * (now reached only after a successful empty result). A failed refetch with data already on screen keeps the data.
 * `frame` wraps the loading line and the error card where the page gives its content area no padding of its own.
 */
export function QueryState({ query, what, frame, children }: { query: QueryLike; what: string; frame?: CSSProperties; children: ReactNode }) {
    const framed = (node: ReactNode) => (frame ? <div style={frame}>{node}</div> : node);
    if (query.isLoading) return framed(<p role="status" style={loading}>Loading…</p>);
    if (query.isError && query.data === undefined) {
        return framed(
            <div role="alert" style={failed}>
                <span>Couldn't load {what}.</span>
                <Button variant="secondary" size="sm" onClick={() => { void query.refetch(); }}>Retry</Button>
            </div>,
        );
    }
    return <>{children}</>;
}
