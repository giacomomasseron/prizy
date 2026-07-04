import type { IssueStatus } from '../../lib/types';

export interface IssueDrawers {
    openCreate(opts?: { status?: IssueStatus }): void;
}

/** Stub — Task 5 will replace this with the real drawer implementation. */
export function useIssueDrawers(): IssueDrawers {
    return {
        openCreate: (_opts?: { status?: IssueStatus }) => {
            // no-op until Task 5 provides the real drawer
        },
    };
}
