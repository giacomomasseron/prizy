import { useSearchParams } from 'react-router-dom';
import type { IssueStatus } from '../../lib/types';

export interface IssueDrawerState {
    peekId: string | null;
    createOpen: boolean;
    createStatus: IssueStatus | null;
    openPeek(id: string): void;
    openCreate(opts?: { status?: IssueStatus }): void;
    close(): void;
}

/** Backwards-compat alias so existing callers that only use openCreate still compile. */
export type IssueDrawers = IssueDrawerState;

export function useIssueDrawers(): IssueDrawerState {
    const [searchParams, setSearchParams] = useSearchParams();

    const peekId = searchParams.get('peek');
    const createOpen = searchParams.has('create');
    const createStatus = searchParams.get('status') as IssueStatus | null;

    function openPeek(id: string) {
        setSearchParams({ peek: id }, { replace: true });
    }

    function openCreate(opts?: { status?: IssueStatus }) {
        const params: Record<string, string> = { create: '1' };
        if (opts?.status) params.status = opts.status;
        setSearchParams(params, { replace: true });
    }

    function close() {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('peek');
            next.delete('create');
            next.delete('status');
            return next;
        }, { replace: true });
    }

    return { peekId, createOpen, createStatus, openPeek, openCreate, close };
}
