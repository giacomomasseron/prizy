import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';

export type DigestFrequency = 'off' | 'daily' | 'weekly';

export function useUpdateNotificationPreferences() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (email_digest_frequency: DigestFrequency) =>
            api.patch<void>('/notifications/preferences', { email_digest_frequency }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
            qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
        },
    });
}

export type ModuleSwitches = { helpdesk_enabled?: boolean; tracker_enabled?: boolean };

/**
 * Workspace-level module switches: send only the one that changes. Invalidates `me` because that payload carries
 * the switches the navigation reads — without it the rows of a module switched off would linger until the next reload.
 */
export function useUpdateModules() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (change: ModuleSwitches) =>
            api.patch<{ id: string; name: string; slug: string; helpdesk_enabled: boolean; tracker_enabled: boolean }>('/workspace', change),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
            qc.invalidateQueries({ queryKey: ['workspace'] });
        },
    });
}

export interface WorkspaceSummary {
    id: string;
    name: string;
    slug: string;
    /** The mark colour picked at sign-up (#rrggbb), or null. */
    color: string | null;
    helpdesk_enabled: boolean;
    tracker_enabled: boolean;
    member_count: number;
    team_count: number;
}

/** The workspace's name and size, which the delete confirmation spells out. */
export function useWorkspace() {
    return useQuery({
        queryKey: ['workspace'],
        queryFn: () => api.get<WorkspaceSummary>('/workspace'),
    });
}

/** Deletes the workspace for good; `confirm` is its name, typed by the owner. */
export function useDeleteWorkspace() {
    return useMutation({
        mutationFn: (confirm: string) => api.del('/workspace', { confirm }),
    });
}
