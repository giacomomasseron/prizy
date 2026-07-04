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
        setSearchParams((prev) => {
            prev.delete('create');
            prev.delete('status');
            prev.set('peek', id);
            return prev;
        }, { replace: true });
    }

    function openCreate(opts?: { status?: IssueStatus }) {
        setSearchParams((prev) => {
            prev.delete('peek');
            prev.set('create', '1');
            if (opts?.status) prev.set('status', opts.status); else prev.delete('status');
            return prev;
        }, { replace: true });
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
