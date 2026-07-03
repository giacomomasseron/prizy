import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';

export type DigestFrequency = 'off' | 'daily' | 'weekly';

export function useUpdateNotificationPreferences() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (email_digest_frequency: DigestFrequency) =>
            api.patch<void>('/notifications/preferences', { email_digest_frequency }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
    });
}
