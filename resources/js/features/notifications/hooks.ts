import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/apiClient';
import type { AppNotification, NotificationPreferences, NotificationSubscription } from '../../lib/types';

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
}

export function useNotifications(category = 'all', unreadOnly = false, enabled = true) {
    return useQuery({
        queryKey: ['notifications', 'list', category, unreadOnly],
        queryFn: () => {
            const params: string[] = [];
            if (category !== 'all') params.push(`filter[category]=${category}`);
            if (unreadOnly) params.push('filter[unread]=true');
            return api.page<AppNotification>(`/notifications${params.length ? `?${params.join('&')}` : ''}`);
        },
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

export function useMarkUnread() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<AppNotification>(`/notifications/${id}/unread`),
        onSuccess: () => invalidateAll(qc),
    });
}

export function useToggleSnooze() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<AppNotification>(`/notifications/${id}/snooze`),
        onSuccess: () => invalidateAll(qc),
    });
}

export function useToggleArchive() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<AppNotification>(`/notifications/${id}/archive`),
        onSuccess: () => invalidateAll(qc),
    });
}

export function usePreferences() {
    return useQuery({
        queryKey: ['notifications', 'preferences'],
        queryFn: () => api.get<NotificationPreferences>('/notifications/preferences'),
    });
}

export function useSetPreference() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: { event_type: string; channel: string; enabled: boolean }) =>
            api.patch<void>('/notifications/preferences', { preferences: [body] }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
            invalidateAll(qc);
        },
    });
}

export function useSubscriptions() {
    return useQuery({
        queryKey: ['notifications', 'subscriptions'],
        queryFn: () => api.get<{ subscriptions: NotificationSubscription[] }>('/notifications/subscriptions'),
    });
}

export function useSetSubscription() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: { scope_type: string; scope_id: string; level: string }) =>
            api.patch<void>('/notifications/subscriptions', body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications', 'subscriptions'] });
            invalidateAll(qc);
        },
    });
}
