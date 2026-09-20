import { useMutation, useQueryClient } from '@tanstack/react-query';
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
