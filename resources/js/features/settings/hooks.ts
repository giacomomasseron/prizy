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

/**
 * Workspace-level module switch. Invalidates `me` because that payload carries
 * the switch the navigation reads — without it the desk rows would linger until
 * the next reload.
 */
export function useUpdateHelpdeskEnabled() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (helpdesk_enabled: boolean) =>
            api.patch<{ id: string; name: string; slug: string; helpdesk_enabled: boolean }>('/workspace', { helpdesk_enabled }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['me'] });
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
