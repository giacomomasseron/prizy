import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '../../auth/useAuth';
import { getEcho, onReconnect } from '../../lib/echo';

/** Keep the notifications live: refetch on each new one, and when the socket comes back after dropping. */
export function useRealtimeNotifications(): void {
    const me = useMe();
    const qc = useQueryClient();
    const userId = me.data?.id;

    useEffect(() => {
        if (!userId) return;
        const echo = getEcho();
        if (!echo) return;

        const channel = `users.${userId}`;
        echo.private(channel).listen('.NotificationCreated', () => {
            qc.invalidateQueries({ queryKey: ['notifications'] });
        });
        const stopWatching = onReconnect(echo.connector, () => void qc.invalidateQueries({ queryKey: ['notifications'] }));

        return () => {
            stopWatching();
            echo.leave(channel);
        };
    }, [userId, qc]);
}
