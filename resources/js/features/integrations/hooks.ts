import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { SlackIntegration } from '../../lib/types';

const KEY = ['integrations', 'slack'];

export function useSlackIntegration() {
    return useQuery({ queryKey: KEY, queryFn: () => api.get<SlackIntegration>('/integrations/slack') });
}

export interface SlackSaveInput {
    webhook_url?: string;
    events: string[];
    is_active: boolean;
}

export function useSaveSlackIntegration() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: SlackSaveInput) => api.put<SlackIntegration>('/integrations/slack', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useSendSlackTest() {
    return useMutation({ mutationFn: () => api.post<void>('/integrations/slack/test') });
}
