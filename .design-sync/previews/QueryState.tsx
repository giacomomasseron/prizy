import { QueryState } from '@prizy/ui';

export const Loading = () => (
    <QueryState query={{ isLoading: true, isError: false, refetch: () => {} }} what="issues" frame={{ padding: 24 }}>
        <p>Never shown while loading.</p>
    </QueryState>
);

export const Failed = () => (
    <div style={{ width: 460 }}>
        <QueryState query={{ isLoading: false, isError: true, refetch: () => {} }} what="the ticket queue" frame={{ padding: 24 }}>
            <p>Never shown when the query failed with no data.</p>
        </QueryState>
    </div>
);

export const Loaded = () => (
    <QueryState query={{ isLoading: false, isError: false, data: [], refetch: () => {} }} what="releases" frame={{ padding: 24 }}>
        <div style={{ padding: 24, fontSize: 14, color: 'var(--fg2)' }}>No releases yet. Ship a cycle to start the changelog.</div>
    </QueryState>
);
