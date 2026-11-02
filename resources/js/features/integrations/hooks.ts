import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { GithubIntegration, SlackIntegration } from '../../lib/types';

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

const GH_KEY = ['integrations', 'github'];

export function useGithubIntegration() {
    return useQuery({ queryKey: GH_KEY, queryFn: () => api.get<GithubIntegration>('/integrations/github') });
}

export interface GithubSaveInput {
    webhook_secret?: string;
    move_to_done_on_merge: boolean;
    is_active: boolean;
}

export function useSaveGithubIntegration() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: GithubSaveInput) => api.put<GithubIntegration>('/integrations/github', input),
        onSuccess: () => qc.invalidateQueries({ queryKey: GH_KEY }),
    });
}

export function useDisconnectSlack() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.del('/integrations/slack'),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useDisconnectGithub() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.del('/integrations/github'),
        onSuccess: () => qc.invalidateQueries({ queryKey: GH_KEY }),
    });
}
