import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { AppNotification } from '../../lib/types';

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
}

export function useNotifications(unreadOnly = false, enabled = true) {
    return useQuery({
        queryKey: ['notifications', 'list', unreadOnly],
        queryFn: () => api.page<AppNotification>(`/notifications${unreadOnly ? '?filter[unread]=true' : ''}`),
        refetchOnWindowFocus: true,
        enabled,
    });
}

export function useUnreadCount() {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
        refetchInterval: 300_000,
        refetchOnWindowFocus: true,
    });
}

export function useMarkRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<AppNotification>(`/notifications/${id}/read`),
        onSuccess: () => invalidateAll(qc),
    });
}

export function useMarkAllRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<void>('/notifications/read-all'),
        onSuccess: () => invalidateAll(qc),
    });
}
